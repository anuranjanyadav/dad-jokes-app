let currentJoke = null;

async function fetchJoke() {
    try {
        const response = await fetch('/api/jokes/random');
        const joke = await response.json();
        return joke;
    } catch (error) {
        console.error('Error fetching joke:', error);
        return null;
    }
}

async function displayNewJoke() {
    // Hide punchline
    document.getElementById('punchline').style.display = 'none';
    const questionButton = document.getElementById('whyButton');
    questionButton.style.display = 'inline-block';
    
    // Fetch and display new joke
    currentJoke = await fetchJoke();
    if (currentJoke) {
        document.getElementById('setup').textContent = currentJoke.setup;
        document.getElementById('punchline').textContent = currentJoke.punchline;
        
        // Change button text based on the setup question
        if (currentJoke.setup.toLowerCase().startsWith('what')) {
            questionButton.textContent = 'What?';
        } else {
            questionButton.textContent = 'Why?';
        }
    } else {
        document.getElementById('setup').textContent = 'Error loading joke';
    }
}

// Show punchline when question button is clicked
document.getElementById('whyButton').addEventListener('click', function() {
    document.getElementById('punchline').style.display = 'block';
    this.style.display = 'none'; // Hide the button after revealing punchline
});

// Load next joke when "Next Joke" is clicked
document.getElementById('nextJoke').addEventListener('click', displayNewJoke);

// Load first joke when page loads
displayNewJoke();

// Add form submission handling
document.getElementById('jokeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const setup = document.getElementById('newSetup').value;
    const punchline = document.getElementById('newPunchline').value;
    const statusDiv = document.getElementById('submitStatus');
    
    try {
        // First check if joke is valid and unique
        const checkResponse = await fetch('/api/jokes/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ setup, punchline })
        });
        
        const checkResult = await checkResponse.json();
        
        if (checkResult.similar) {
            statusDiv.textContent = checkResult.message;
            statusDiv.className = 'status-message error';
            return;
        }
        
        if (!checkResult.valid) {
            statusDiv.textContent = checkResult.message;
            statusDiv.className = 'status-message error';
            return;
        }
        
        // If valid, submit the joke
        const submitResponse = await fetch('/api/jokes/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ setup, punchline })
        });
        
        if (submitResponse.ok) {
            statusDiv.textContent = 'Joke submitted successfully!';
            statusDiv.className = 'status-message success';
            document.getElementById('jokeForm').reset();
        } else {
            throw new Error('Failed to submit joke');
        }
    } catch (error) {
        console.error('Error:', error);
        statusDiv.textContent = 'Error submitting joke. Please try again.';
        statusDiv.className = 'status-message error';
    }
});