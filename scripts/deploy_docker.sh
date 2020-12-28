#!/bin/bash

# See https://docs.gitlab.com/ee/ci/variables/predefined_variables.html

set -euo pipefail

# Print info about the current user logged into AWS for debugging purposes
aws sts get-caller-identity

if [ -z ${CI_MERGE_REQUEST_ID:-} ]; then
    # CI_MERGE_REQUEST_ID is not set, it's not a merge request
    # Set DOCKER_TAG_NAME to the incoming branch's name
    DOCKER_TAG_NAME=$CI_COMMIT_REF_NAME

    # Get login token and execute login
    $(aws ecr get-login --no-include-email --region $AWS_REGION)

    if [ "$DOCKER_TAG_NAME" = "develop" -o "$DOCKER_TAG_NAME" = "master" ]; then
        # Use staging tag instead of master if on branch master
        if [ "$DOCKER_TAG_NAME" = "master" ]; then
            DOCKER_TAG_NAME="staging"
        fi

        # If image does not exist, don't use cache
        # Useful to not build the entire image each time
        echo "Creating a new IMAGE: ${DOCKER_TAG_NAME}"

        docker pull $REGISTRY_URI:$DOCKER_TAG_NAME && \
        docker build -t $DOCKER_PROJECT_NAME -f Dockerfile . --cache-from $REGISTRY_URI:$DOCKER_TAG_NAME || \
        docker build -t $DOCKER_PROJECT_NAME -f Dockerfile .
    else
        # Used for RELEASES (TAGGED builds)
        # Releases will use the staging docker image (master) to be generated
        echo "Creating a new RELEASE image: ${DOCKER_TAG_NAME}"

        docker pull $REGISTRY_URI:staging && \
        docker build -t $DOCKER_PROJECT_NAME -f Dockerfile . --cache-from $REGISTRY_URI:staging || \
        docker build -t $DOCKER_PROJECT_NAME -f Dockerfile .
    fi

    echo "Tagging and pushing image with tag ${DOCKER_TAG_NAME}"
    docker tag $DOCKER_PROJECT_NAME $REGISTRY_URI:$DOCKER_TAG_NAME
    docker push $REGISTRY_URI:$DOCKER_TAG_NAME

    # if [ "$CI_COMMIT_REF_NAME" = "develop" -o "$CI_COMMIT_REF_NAME" = "master" ]; then
    #     echo "Trigger autodeployer..."
    #     # Send a POST request to autodeployer, which will restart the application on k8s
    #     curl --header "Content-Type: application/json" \
    #         --request POST \
    #         --data '{"push_data": {"tag": "'"$DOCKER_TAG_NAME"'" }}' \
    #         $AUTODEPLOY_URL
    # else
    #     echo "This is neither develop or master branch, won't trigger autodeployer."
    # fi
else
  echo "This is a Merge Request, won't go through the deployment process."
fi
