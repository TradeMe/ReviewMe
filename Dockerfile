FROM node:14-alpine

ARG ReviewMeVersion=2

# Workaroudn when building on an AWS EC2 c5/m5/t3 instance
# RUN npm config set unsafe-perm true

RUN npm install -g @trademe/reviewme@${ReviewMeVersion}
