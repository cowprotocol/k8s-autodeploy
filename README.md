This is an application to allow you pull new docker images created from your CI 
scripts. When you modificy a latest or any other tag, Kubernetes needs some
call to tell to your deployment that need to be restarted and pull the new 
downloaded image.

## CI script

Make sure your CI script will call your auto deployment:

```
export AUTODEPLOY_URL="https://YOUR_NAMESPACE.auto.gnosisdev.com/services/YOUR_DEPLOYMENT_NAME_1,YOUR_DEPLOYMENT_NAME_2,[...]/rollout"
export AUTODEPLOY_TOKEN="Your can set this with `openssl rand -base64 32`"
export TRAVIS_BRANCH=master

curl -s --output /dev/null --write-out "%{http_code}" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{"token": "'$AUTODEPLOY_TOKEN'", "push_data": {"tag": "'$TRAVIS_BRANCH'" }}' \
    $AUTODEPLOY_URL
```

## Create a Deployment

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: k8s-autodeploy
  namespace: YOUR_NAMESPACE
spec:
  replicas: 1
  minReadySeconds: 10
  selector:
    matchLabels:
      app: k8s-autodeploy
  template:
    metadata:
      labels:
        k8s-app: k8s-autodeploy
        app: k8s-autodeploy
    spec:
      serviceAccount: k8s-autodeploy
      serviceAccountName: k8s-autodeploy
      containers:
        - name: k8s-autodeploy
          image: AWS_ID.dkr.ecr.us-east-1.amazonaws.com/k8s-autodeploy:v1.3.0@sha256:7028f741137fd3af1cb4843cdaceeae8013ca0487c17938913b72c36dbe9eebb
          imagePullPolicy: IfNotPresent
          resources:
            requests:
              memory: "25Mi"
              cpu: "20m"
            limits:
              memory: "150Mi"
              cpu: "50m"
          env:
            - name: DEBUG
              value: "k8s-autodeploy:*"
          args: ["/usr/local/bin/yarn", "start"]
```

## Give rights to your deployment

```
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: k8s-autodeploy
  namespace: YOUR_NAMESPACE

---
kind: Role
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: k8s-autodeploy
  namespace: YOUR_NAMESPACE
rules:
- apiGroups: ["extensions"]
  resources: ["deployments", "replicasets"]
  verbs: ["create", "get", "list", "update", "delete"]

---
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: k8s-autodeploy
  namespace: YOUR_NAMESPACE
subjects:
- kind: ServiceAccount
  name: k8s-autodeploy
  namespace: YOUR_NAMESPACE
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: k8s-autodeploy
```
