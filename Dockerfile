# Use the official Node.js 18 base image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install project dependencies
RUN npm ci --only=production

# Copy the build artifacts
COPY dist ./dist

# Expose the port that the Nest.js application will listen on
EXPOSE 3000

# Start the Nest.js application
CMD [ "node", "dist/main" ]
