# External Systems Setup

Configuration required outside this codebase to deploy the custom login app.

## Environment Reference

| Setting | Dev | Prod |
|---------|-----|------|
| Login domain | `auth.dev.fion-energy.com` | `auth.fion-energy.com` |
| Zitadel API URL | `https://development-jzdhrq.zitadel.cloud` | `https://production-dcufuu.zitadel.cloud` |
| Zitadel Console | Same as API URL + `/ui/console` | Same |
| ECR image | `891377298986.dkr.ecr.eu-central-1.amazonaws.com/fion-auth` | Same repo, different tag |
| EKS cluster | `fion-dev` | `fion-prod` |
| K8s namespace | `dev` | `prod` |
| GitHub environment | `Dev` | `Prod` |
| AWS account (EKS) | `339712716017` | `891377357860` |

### Build-Time Environment Variables

Set during Docker image build (in GitHub Actions workflows):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_BASE_PATH` | `/ui/v2/login` |
| `NEXT_OUTPUT_MODE` | `standalone` |

### Runtime Environment Variables

Set via K8s deployment manifest (`deploy/{env}/deployment.yaml`):

| Variable | Source | Description |
|----------|--------|-------------|
| `ZITADEL_API_URL` | Hardcoded in manifest | Zitadel instance URL (see table above) |
| `ZITADEL_SERVICE_USER_TOKEN` | K8s Secret `fion-auth-secrets` | PAT for the service user |

---

## Zitadel

### Service User

Create a **service** user for the login app to call Zitadel Session/Settings APIs.

1. **Console > Users > Service Users > New**
   - Username: `svc-auth-app` (or similar)
   - Access Token Type: **PAT** (Personal Access Token)
2. **Generate a PAT** and save the token value (used as `ZITADEL_SERVICE_USER_TOKEN`)
3. **Grant IAM role**: Console > Users > [service user] > Authorizations > New
   - Select **Instance** level (not an organization)
   - Role: **IAM_LOGIN_CLIENT**
   - This role allows the service user to create/manage sessions on behalf of users

> Repeat for each environment (dev, prod) if using separate Zitadel instances.

### Custom Login URI

Tells Zitadel to redirect OIDC login flows to our app instead of the built-in login.

1. **Console > Settings > Login Behavior and Security > Advanced**
   - Set **Login V2 Base URI**: `https://auth.dev.fion-energy.com/ui/v2/login` (dev) or `https://auth.fion-energy.com/ui/v2/login` (prod)

> This is an **instance-level** setting. All applications on this Zitadel instance will use the custom login.

### Disable User Registration

Registration is controlled at **two levels** — instance and organization. The org-level policy overrides instance.

**Instance level:**
1. Console > Settings > Login Behavior and Security > **User Registration allowed** = off

**Organization level** (if an org-level policy exists, it takes precedence):
- Check via API: `GET /management/v1/policies/login` with `x-zitadel-orgid` header
- If `allowRegister: true` exists at org level, either:
  - **Delete the org policy** to inherit from instance: `DELETE /management/v1/policies/login` with `x-zitadel-orgid` header
  - Or update it: `PUT /management/v1/policies/login` with `allowRegister: false`

> The Zitadel Console may not show org-level login policies in the UI. Use the API to check/fix.

> **Permissions note:** The `svc-auth-app` service user (with `IAM_LOGIN_CLIENT` role) cannot modify login policies. You need a user with `ORG_OWNER` or `IAM_OWNER` role for management API calls. Use a separate admin PAT for these one-time setup operations.

### Enable Password Reset

The instance-level login policy has `hidePasswordReset: true` by default. Enable it so users see the "Reset Password" link.

1. **Console > Settings > Login Behavior and Security > Password Reset** = shown
2. Or via API:
   ```bash
   curl -X PUT "https://<ZITADEL_DOMAIN>/admin/v1/policies/login" \
     -H "Authorization: Bearer <PAT>" \
     -H "Content-Type: application/json" \
     -d '{"hidePasswordReset": false, "allowUsernamePassword": true, ...}'
   ```

### Redirect URIs

No changes needed. The OIDC redirect URIs in your applications (e.g., fion-analysis) stay the same — they point to Zitadel's callback endpoint, not to the login app. Zitadel handles the redirect chain:

```
App → Zitadel /authorize → Custom Login App → Zitadel /session → Zitadel /callback → App
```

---

## AWS

### ECR Repository

Images are stored in the shared ECR account (`891377298986`).

1. Create the repository:
   ```bash
   aws ecr create-repository --repository-name fion-auth --region eu-central-1 \
     --profile AdministratorAccess-891377298986
   ```

2. Add **cross-account pull policy** so dev (`339712716017`) and prod (`891377357860`) EKS clusters can pull:
   ```bash
   aws ecr set-repository-policy --repository-name fion-auth --region eu-central-1 \
     --profile AdministratorAccess-891377298986 \
     --policy-text '{
       "Version": "2012-10-17",
       "Statement": [
         {
           "Sid": "AllowCrossAccountPull",
           "Effect": "Allow",
           "Principal": {
             "AWS": [
               "arn:aws:iam::339712716017:root",
               "arn:aws:iam::891377357860:root"
             ]
           },
           "Action": [
             "ecr:GetDownloadUrlForLayer",
             "ecr:BatchGetImage",
             "ecr:BatchCheckLayerAvailability"
           ]
         }
       ]
     }'
   ```

---

## GitHub

### Repository Environments

Create two environments in the repo settings (Settings > Environments):

| Environment | Purpose |
|-------------|---------|
| **Dev** | Used by `build-and-deploy-develop.yaml` |
| **Prod** | Used by `deploy-prod.yaml` |

### Secrets

Each environment needs the following secret:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `FION_AUTH_SVC` | Zitadel service user PAT | Used to create K8s secret `fion-auth-secrets` during deploy |

> The PAT value is different per environment if using separate Zitadel instances (dev vs prod).

---

## Deployment Order

Follow this order — each step depends on the previous one.

### 1. AWS: ECR Repository

Create the ECR repo so the CI pipeline has somewhere to push images.

```bash
aws ecr create-repository --repository-name fion-auth --region eu-central-1 \
  --profile AdministratorAccess-891377298986
```

Add **cross-account pull policy** so dev (`339712716017`) and prod (`891377357860`) EKS clusters can pull:

```bash
aws ecr set-repository-policy --repository-name fion-auth --region eu-central-1 \
  --profile AdministratorAccess-891377298986 \
  --policy-text '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowCrossAccountPull",
        "Effect": "Allow",
        "Principal": {
          "AWS": [
            "arn:aws:iam::339712716017:root",
            "arn:aws:iam::891377357860:root"
          ]
        },
        "Action": [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  }'
```

### 2. GitHub: Secrets

Set the `FION_AUTH_SVC` secret in the corresponding GitHub environment:

```bash
# Dev
gh secret set FION_AUTH_SVC --repo fion-energy/fion-login --env Dev
# Prod
gh secret set FION_AUTH_SVC --repo fion-energy/fion-login --env Prod
```

The PAT value comes from the service user created in the Zitadel step. Stored in 1Password under `API - Zitadel - svc-auth-app - {Dev,Prod}`.

### 3. Deploy to EKS

Push to `develop` (dev) or trigger `deploy-prod.yaml` (prod). The workflow:
1. Builds the Docker image and pushes to ECR
2. Creates/updates the K8s secret `fion-auth-secrets` from the `FION_AUTH_SVC` GitHub secret
3. Applies deployment, service, and ingress manifests

The ingress tells Traefik about the host and triggers external-dns.

### 4. DNS (Route 53)

If external-dns is running in the cluster, the ingress from step 2 automatically creates the DNS record. Otherwise create manually:

| Record | Type | Target | Environment |
|--------|------|--------|-------------|
| `auth.dev.fion-energy.com` | A / CNAME | Dev Traefik LB | Dev |
| `auth.fion-energy.com` | A / CNAME | Prod Traefik LB | Prod |

### 5. Verify

- [ ] Health check: `curl https://auth.fion-energy.com/ui/v2/login/healthy`
- [ ] Visit login page directly: `https://auth.fion-energy.com/ui/v2/login/loginname`
- [ ] Branding, fonts, carousel all render correctly

### 6. Activate (when ready)

Set the **Custom Login URI** in Zitadel Console. This is the switch — until this is done, users still see the built-in login.

- [ ] OIDC flow: login from fion-analysis, redirects to custom login, completes, redirects back
- [ ] "Register new user" link does NOT appear
- [ ] Password reset link appears on password page
- [ ] Logout from fion-analysis ends Zitadel session

### Rollback

Remove the Custom Login URI in Zitadel Console to instantly revert to the built-in login. No code changes needed.
