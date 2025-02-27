let currentJoke = null;

async function fetchJoke() {
    try {
        const response = await fetch('/api/jokes/random');
        currentJoke = await response.json();
        
        // Log the joke view
        await fetch('/api/jokes/view', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jokeId: currentJoke.id })  // Only send jokeId
        });

        // Update the statistics card
        const statsResponse = await fetch('/api/joke/statistics');
        const stats = await statsResponse.json();
        document.getElementById('totalJokesViewed').textContent = stats.total_jokes_viewed; // Update the viewed count

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
        } else if (currentJoke.setup.toLowerCase().startsWith('how')) {
            questionButton.textContent = 'How';
        } else if (currentJoke.setup.toLowerCase().startsWith('when')) {
            questionButton.textContent = 'When';
        } else {
            questionButton.textContent = 'Why?'; // Default case
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

// Event Listener for Next Joke button
document.getElementById('nextJoke').addEventListener('click', debounce(async function() {
    await fetchJoke();  // Fetch a new joke

    // Clear the status message and reset the form
    const statusDiv = document.getElementById('submitStatus');
    statusDiv.innerHTML = '';  // Clear any existing messages
    statusDiv.style.display = 'none';  // Hide the status message

    // Reset the form fields
    document.getElementById('newSetup').value = '';
    document.getElementById('newPunchline').value = '';

    // Optionally, hide the AI and Human badges
    document.getElementById('aiBadge').style.display = 'none';
    document.getElementById('humanBadge').style.display = 'none';
}, 100));  // Set the delay to 100 ms

// Load first joke when page loads
displayNewJoke();

// Call fetchJoke when the page loads
window.onload = fetchJoke;

// Form submission handling
document.getElementById('jokeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const setup = document.getElementById('newSetup').value;
    const punchline = document.getElementById('newPunchline').value;
    const statusDiv = document.getElementById('submitStatus');
    
    try {
        // Submit the joke
        const submitResponse = await fetch('/api/jokes/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ setup, punchline })
        });
        
        if (submitResponse.ok) {
            // Increment the displayed total jokes added count immediately
            const totalJokesAddedElement = document.getElementById('totalJokesAdded');
            totalJokesAddedElement.textContent = parseInt(totalJokesAddedElement.textContent) + 1; // Increment the count

            statusDiv.innerHTML = 'Joke submitted successfully!';
            statusDiv.className = 'status-message success';
            document.getElementById('jokeForm').reset(); // Reset the form
        } else {
            throw new Error('Failed to submit joke');
        }
        
    } catch (error) {
        console.error('Error submitting joke:', error);
        statusDiv.innerHTML = 'Error submitting joke. Please try again.';
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
        } else if (joke.setup.toLowerCase().startsWith('how to')) {
            questionButton.textContent = 'How';
        } else if (joke.setup.toLowerCase().startsWith('when')) {
            questionButton.textContent = 'When';
        } else {
            questionButton.textContent = 'Why?'; // Default case
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('setup').textContent = 'Error generating joke';
    }
});

async function fetchStatistics() {
    try {
        const response = await fetch('/api/joke/statistics');
        const stats = await response.json();
        document.getElementById('totalJokesAdded').textContent = stats.total_jokes_added;
        document.getElementById('totalJokesViewed').textContent = stats.total_jokes_viewed;
    } catch (error) {
        console.error('Error fetching statistics:', error);
    }
}

// Call this function when the page loads
fetchStatistics();

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func.apply(null, args);
        }, delay);
    };
}