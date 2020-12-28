FROM node:10-alpine3.10

# Install Kubectl binary
RUN apk update && \
apk add --no-cache bash git openssh curl tini && \
curl -LO https://storage.googleapis.com/kubernetes-release/release/v1.18.5/bin/linux/amd64/kubectl && \
chmod +x kubectl && mv kubectl /usr/local/bin/kubectl && \
rm -rf /var/cache/apk/*

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --pure-lockfile

COPY . .

# Tini is now available at /sbin/tini
ENTRYPOINT ["/sbin/tini", "--"]
