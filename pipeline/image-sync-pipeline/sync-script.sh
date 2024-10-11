#!/bin/bash

# Define the name of your Azure Container Registry
ACR_NAME="$1"
IMAGE_LIST_PATH="$2"
DOCKER_USERNAME="$3"
DOCKER_PASSWORD="$4"

# Read the image list from the specified file
while IFS= read -r IMAGE; do
  # Ignore comment lines and empty lines
  if [[ $IMAGE == \#* ]] || [[ -z $IMAGE ]]; then
    continue
  fi

  # Split the source and destination using '=>' as the delimiter
  # Use parameter expansion to split
  SOURCE="${IMAGE%%=>*}"
  DESTINATION="${IMAGE##*=>}"

  # Trim whitespace from both source and destination
  SOURCE=$(echo "$SOURCE" | xargs)
  DESTINATION=$(echo "$DESTINATION" | xargs)

  # Extract the tag from the source image
  if [[ "$SOURCE" == *:* ]]; then
    TAG="${SOURCE##*:}"
  else
    TAG="latest"
  fi

  # Append the tag to the destination image
  DESTINATION_WITH_TAG="$DESTINATION:$TAG"

  # Extract the image name from the destination path
  IMAGE_NAME=$(basename "$DESTINATION")

  # Print a message indicating the import process
  echo "Importing $IMAGE_NAME:$TAG from $SOURCE to $DESTINATION_WITH_TAG..."
  
  # Build and execute the az acr import command
  # If the source is from docker.io, include username and password
  if [[ $SOURCE == docker.io* ]]; then
    az acr import --name "$ACR_NAME" --source "$SOURCE" --image "$DESTINATION_WITH_TAG" --username "$DOCKER_USERNAME" --password "$DOCKER_PASSWORD" --force
  else
    # Otherwise, import without authentication
    az acr import --name "$ACR_NAME" --source "$SOURCE" --image "$DESTINATION_WITH_TAG" --force
  fi

  # Confirm the import completion
  echo -e "The $IMAGE_NAME:$TAG has been imported.\n\n"
  
  # Pause for 15 seconds before processing the next image
  sleep 15
done < "$IMAGE_LIST_PATH"
