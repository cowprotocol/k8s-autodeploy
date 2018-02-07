from node:9.5.0-alpine

RUN apk update && \
apk add --no-cache bash git openssh curl

RUN apk add --no-cache tini
RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/v1.9.0/bin/linux/amd64/kubectl
RUN chmod +x kubectl && mv kubectl /usr/local/bin/kubectl

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --pure-lockfile

COPY . .
# Tini is now available at /sbin/tini
ENTRYPOINT ["/sbin/tini", "--"]