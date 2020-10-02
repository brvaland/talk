FROM node:10-alpine

# Update system
RUN apk update
RUN apk upgrade

# update npm to latest to fix vulnerability - CVE-2020-8116
RUN npm -g upgrade npm

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Setup the environment
ENV PATH /usr/src/app/bin:$PATH
ENV TALK_PORT 5000
EXPOSE 5000

# Bundle app source
COPY . /usr/src/app

# Ensure the runtime of the container is in production mode.
ENV NODE_ENV production

# Store the current git revision.
ARG REVISION_HASH
ENV REVISION_HASH=${REVISION_HASH}

# Install app dependencies and build static assets.
# Pin node-gyp@6.1.0 as newer versions do not build on Node 8.
RUN yarn global add node-gyp@6.1.0 && \
    yarn install --frozen-lockfile && \
    yarn build && \
    yarn cache clean

# Run container as a non-root user
RUN adduser \
    --disabled-password \
    --home /usr/src/app \
    --gecos '' app \
    && chown -R app /usr/src/app

USER app

CMD ["yarn", "start"]
