# Use the Node.js LTS image as a base
FROM node:lts

# Copy app source
COPY . /app

WORKDIR /app

# Install app dependencies
RUN npm install

# Expose port to outside world
EXPOSE 3000

# Start command as per the package.json file
CMD ["npm", "start"]

