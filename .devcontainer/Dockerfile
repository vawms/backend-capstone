FROM node:25-bookworm

# Install OS basics and Postgres client
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      git ca-certificates curl build-essential python3 \
      postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Optional: global tools
RUN npm install -g @nestjs/cli

# Create a non-root user (VS Code Dev Container convention)
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=1000
RUN usermod -u $USER_UID $USERNAME && groupmod -g $USER_GID $USERNAME

WORKDIR /workspace