# Use a lightweight Python base image
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Copy the game files into the container
COPY cursor-gpt-5-game/ ./cursor-gpt-5-game/

# Expose the port the game will run on
EXPOSE 5173

# Command to run the static file server
CMD ["python", "-m", "http.server", "5173", "--directory", "cursor-gpt-5-game/"]
