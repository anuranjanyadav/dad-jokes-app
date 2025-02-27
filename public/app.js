let currentJoke = null;

async function fetchJoke() {
    try {
        const response = await fetch('/api/jokes/random');
        currentJoke = await response.json();
        
        document.getElementById('setup').textContent = currentJoke.setup;
        document.getElementById('punchline').textContent = currentJoke.punchline;
        document.getElementById('punchline').style.display = 'none';
        document.getElementById('whyButton').style.display = 'inline-block';
        
        // Show the appropriate badge
        document.getElementById('aiBadge').style.display = 
            currentJoke.is_ai_generated ? 'block' : 'none';
        document.getElementById('humanBadge').style.display = 
            currentJoke.is_ai_generated ? 'none' : 'block';
        
        // Update button text based on setup
        const questionButton = document.getElementById('whyButton');
        if (currentJoke.setup.toLowerCase().startsWith('what')) {
            questionButton.textContent = 'What?';
        } else {
            questionButton.textContent = 'Why?';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('setup').textContent = 'Error loading joke';
    }
}

async function displayNewJoke() {
    // Hide punchline
    document.getElementById('punchline').style.display = 'none';
    const questionButton = document.getElementById('whyButton');
    questionButton.style.display = 'inline-block';
    
    // Fetch and display new joke
    await fetchJoke();
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

// Form submission handling
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
        
        // Create or update status message
        let statusMessage = '';
        if (!checkResult.valid) {
            statusMessage = `
                <div class="error-message">${checkResult.message}</div>
                <div class="status-content">
                    <span class="ai-validator-badge" title="Validated by AI">AI</span>
                    <span class="status-text">* This is an AI validation</span>
                </div>
            `;
            statusDiv.className = 'status-message error';
        } else {
            // If valid, submit the joke
            const submitResponse = await fetch('/api/jokes/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ setup, punchline })
            });
            
            if (submitResponse.ok) {
                statusMessage = 'Joke submitted successfully!';
                statusDiv.className = 'status-message success';
                document.getElementById('jokeForm').reset();
            } else {
                throw new Error('Failed to submit joke');
            }
        }
        
        statusDiv.innerHTML = statusMessage;
        statusDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        statusDiv.innerHTML = `
            <div class="error-message">Error submitting joke. Please try again.</div>
            <div class="status-content">
                <span class="ai-validator-badge" title="Validated by AI">AI</span>
                <span class="status-text">* This is an AI validation</span>
            </div>
        `;
        statusDiv.className = 'status-message error';
    }
});

// Add event listener for AI generation
document.getElementById('generateAIJoke').addEventListener('click', async function() {
    console.log('AI Generate button clicked');
    try {
        const response = await fetch('/api/jokes/generate', {
            method: 'POST'
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error:', errorData);
            throw new Error('Failed to generate joke');
        }
        
        const joke = await response.json();
        console.log('Generated joke:', joke);
        
        currentJoke = joke;
        document.getElementById('punchline').style.display = 'none';
        document.getElementById('whyButton').style.display = 'inline-block';
        document.getElementById('setup').textContent = joke.setup;
        document.getElementById('punchline').textContent = joke.punchline;
        document.getElementById('aiBadge').style.display = 'block';  // Show AI badge for generated jokes
        
        // Update button text based on setup
        const questionButton = document.getElementById('whyButton');
        if (joke.setup.toLowerCase().startsWith('what')) {
            questionButton.textContent = 'What?';
        } else {
            questionButton.textContent = 'Why?';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('setup').textContent = 'Error generating joke';
    }
});