FROM node:20-alpine as base
ARG env
WORKDIR /webapps

COPY . .

RUN yarn install && yarn build


CMD ["yarn", "start"]
