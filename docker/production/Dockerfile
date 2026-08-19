#Using Lightweight Docker image for Node.js
FROM node:20-alpine as base

#Setting up working directory
WORKDIR /user/src/backent-app

#Copying packege.json and package-lock.json
COPY package*.json ./

#Installing dependencies
RUN npm ci --only=production

#Copying source files
COPY . .

# Build TypeScript Project
RUN npm run build

#Exposing port
EXPOSE 8080

#Running the app
CMD [ "npm", "run", "start" ]
