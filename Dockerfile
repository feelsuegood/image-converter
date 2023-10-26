# Use the Node.js LTS image as a base
FROM node:lts

# Copy app source
COPY . /app

# Set working directory
WORKDIR /app

# Install system dependencies for Sharp
RUN apt-get update && apt-get install -y libvips-dev

# Install app dependencies
RUN npm install

# Expose port to outside world
EXPOSE 3000

# Start command as per the package.json file
CMD ["npm", "start"]

