const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileName = document.getElementById('fileName');
const analyzeBtn = document.getElementById('analyzeBtn');
const platformSelect = document.getElementById('platformSelect');
const resultsSection = document.getElementById('results');
const themeToggle = document.getElementById('themeToggle');

let chatData = null;
let isDarkMode = false;
let currentCharts = []; 

document.addEventListener('DOMContentLoaded', function() {
    // Setting up event listeners
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-500');
        dropZone.classList.remove('border-gray-300');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-indigo-500');
        dropZone.classList.add('border-gray-300');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500');
        dropZone.classList.add('border-gray-300');
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    analyzeBtn.addEventListener('click', analyzeChat);
    
    // Checking if we have stored data
    const storedData = localStorage.getItem('chatData');
    if (storedData) {
        chatData = JSON.parse(storedData);
        analyzeBtn.disabled = false;
    }
});

// Functions
function handleFileSelect(file) {
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
        alert('Please upload a text file (.txt)');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit. Please upload a smaller file.');
        return;
    }
    // Show file name in the drop zone
    fileName.textContent = file.name;
    fileName.classList.remove('hidden');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const platform = platformSelect.value;
        
        // Parse the chat data
        chatData = parseChat(content, platform);
        
        // Enable analyze button
        analyzeBtn.disabled = false;
        
        // Store in localStorage for persistence
        localStorage.setItem('chatData', JSON.stringify(chatData));
    };
    
    reader.readAsText(file);
}

function parseChat(content, platform) {
    const lines = content.split('\n');
    const messages = [];
    let currentDate = null;

    const patterns = {
        whatsapp: /^(\d{1,2}\/\d{1,2}\/\d{2,4}),? (\d{1,2}:\d{2}) - ([^:]+): (.+)$/,
        whatsapp2: /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),? (\d{1,2}:\d{2}:\d{2})\] ([^:]+): (.+)$/,
        telegram: /^(\d{1,2}\.\d{1,2}\.\d{2,4}),? (\d{1,2}:\d{2}) - ([^:]+): (.+)$/,
        facebook: /^(\d{1,2}\/\d{1,2}\/\d{2,4}),? (\d{1,2}:\d{2}) - ([^:]+): (.+)$/
    };
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        
        let match = null;

        if (platform === 'whatsapp') {
            match = line.match(patterns.whatsapp) || line.match(patterns.whatsapp2);
        } else if (platform === 'telegram') {
            match = line.match(patterns.telegram);
        } else if (platform === 'facebook') {
            match = line.match(patterns.facebook);
        }
        
        if (match) {
            let dateStr, timeStr, sender, text;
            
            if (patterns.whatsapp2.test(line)) {
                [, dateStr, timeStr, sender, text] = match;
            } else {
                [, dateStr, timeStr, sender, text] = match;
            }

            const dateTime = parseDateTime(dateStr, timeStr, platform);
            
            messages.push({
                date: dateTime,
                sender: sender.trim(),
                message: text.trim(),
                timestamp: dateTime.getTime()
            });
            currentDate = dateTime;
        } else if (messages.length > 0) {
            messages[messages.length - 1].message += '\n' + line;
        }
    }
    
    return messages;
}

function parseDateTime(dateStr, timeStr, platform) {
    let dateParts, timeParts;
    
    if (platform === 'whatsapp') {
        // Handles different date formats
        if (dateStr.includes('/')) {
            dateParts = dateStr.split('/');
        } else if (dateStr.includes('-')) {
            dateParts = dateStr.split('-');
        }
        timeParts = timeStr.split(':');
    } else if (platform === 'telegram') {
        dateParts = dateStr.split('.');
        timeParts = timeStr.split(':');
    } else if (platform === 'facebook') {
        dateParts = dateStr.split('/');
        timeParts = timeStr.split(':');
    }
    
    let day, month, year;
    
    if (platform === 'whatsapp' || platform === 'facebook') {
        if (parseInt(dateParts[0]) > 1) {
            day = parseInt(dateParts[0]);
            month = parseInt(dateParts[1]) - 1;
            year = parseInt(dateParts[2]);
        } else {
            day = parseInt(dateParts[1]);
            month = parseInt(dateParts[0]) - 1;
            year = parseInt(dateParts[2]);
        }
    } else if (platform === 'telegram') {
        day = parseInt(dateParts[0]);
        month = parseInt(dateParts[1]) - 1;
        year = parseInt(dateParts[2]);
    }
    if (year < 100) {
        year += 2000;
    }       
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = timeParts.length > 2 ? parseInt(timeParts[2]) : 0;
    
    return new Date(year, month, day, hours, minutes, seconds);
}
function analyzeChat() {
    if (!chatData || chatData.length === 0) {
        alert('Please upload a chat file first');
        return;
    }
    clearCharts();

    analyzeBtn.innerHTML = '<div class="loading"></div> Analyzing...';
    analyzeBtn.disabled = true;

    setTimeout(() => {
        try {
            // Analyze the chat
            const analysis = performAnalysis(chatData);
            // Visualize the results
            visualizeResults(analysis);
            // Show results section
            resultsSection.classList.remove('hidden');
            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error("Error during analysis:", error);
            alert("An error occurred during analysis. Please try again.");
        } finally {
            // Always reset button state
            analyzeBtn.innerHTML = '<i class="fas fa-chart-line mr-2"></i> Analyze Chat';
            analyzeBtn.disabled = false;
        }
    }, 100);
}

function clearCharts() {
    // Destroy all existing charts to prevent memory leaks
    currentCharts.forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    currentCharts = [];
}

function performAnalysis(messages) {
    if (messages.length === 0) {
        return null;
    }
    
    // Basic statistics
    const users = {};
    let firstMessageOfDay = {};
    let lastMessageTime = {};
    let responseTimes = {};
    let activeHours = Array(24).fill(0);
    let dailyActivity = {};
    let wordFrequency = {};
    let emojiFrequency = {};
    let sentimentData = [];
    
    // Process each message
    messages.forEach((msg, index) => {
        const date = msg.date;
        const sender = msg.sender;
        const message = msg.message;
        const timestamp = msg.timestamp;
        
        // Initialize user if not exists
        if (!users[sender]) {
            users[sender] = {
                messageCount: 0,
                totalChars: 0,
                totalWords: 0,
                emojis: {},
                sentimentScore: 0,
                firstMessageCount: 0
            };
        }
        
        // Update user stats
        users[sender].messageCount++;
        users[sender].totalChars += message.length;
        users[sender].totalWords += countWords(message);
        
        // Track first message of the day
        const dayKey = date.toDateString();
        if (!firstMessageOfDay[dayKey]) {
            firstMessageOfDay[dayKey] = sender;
            users[sender].firstMessageCount++;
        }
        
        // Track response times
        if (lastMessageTime[sender]) {
            const responseTime = timestamp - lastMessageTime[sender];
            if (!responseTimes[sender]) {
                responseTimes[sender] = [];
            }
            responseTimes[sender].push(responseTime);
        }
        lastMessageTime[sender] = timestamp;
        
        // Track active hours
        const hour = date.getHours();
        activeHours[hour]++;
        
        // Track daily activity
        const dateKey = date.toISOString().split('T')[0];
        if (!dailyActivity[dateKey]) {
            dailyActivity[dateKey] = 0;
        }
        dailyActivity[dateKey]++;
        
        // Analyze words and emojis
        analyzeText(message, wordFrequency, emojiFrequency, users[sender].emojis);
        
        // Analyze sentiment
        const sentiment = analyzeSentiment(message);
        users[sender].sentimentScore += sentiment.score;
        sentimentData.push({
            date: dateKey,
            sender: sender,
            sentiment: sentiment.score
        });
    });
    
    // Calculate averages
    Object.keys(users).forEach(user => {
        users[user].avgChars = users[user].totalChars / users[user].messageCount;
        users[user].avgWords = users[user].totalWords / users[user].messageCount;
        users[user].avgSentiment = users[user].sentimentScore / users[user].messageCount;
        
        if (responseTimes[user] && responseTimes[user].length > 0) {
            users[user].avgResponseTime = responseTimes[user].reduce((a, b) => a + b, 0) / responseTimes[user].length;
        } else {
            users[user].avgResponseTime = null;
        }
    });
    
    // Find most active user
    let mostActiveUser = null;
    let maxMessages = 0;
    
    Object.keys(users).forEach(user => {
        if (users[user].messageCount > maxMessages) {
            maxMessages = users[user].messageCount;
            mostActiveUser = user;
        }
    });
    
    // Find most positive user
    let mostPositiveUser = null;
    let maxSentiment = -Infinity;
    
    Object.keys(users).forEach(user => {
        if (users[user].avgSentiment > maxSentiment) {
            maxSentiment = users[user].avgSentiment;
            mostPositiveUser = user;
        }
    });
    
    // Prepare time series data - filter out future dates
    const timeSeries = prepareTimeSeriesData(dailyActivity);
    
    return {
        users,
        mostActiveUser,
        mostPositiveUser,
        totalMessages: messages.length,
        timeSeries,
        activeHours,
        wordFrequency,
        emojiFrequency,
        firstMessageStats: calculateFirstMessageStats(firstMessageOfDay),
        dateRange: {
            start: messages[0].date,
            end: messages[messages.length - 1].date
        }
    };
}

function countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
}

function analyzeText(text, wordFrequency, emojiFrequency, userEmojis) {
    // Stop words to exclude
    const stopWords = new Set(['he', 'to', 'it', 'is', 'of', 'in', 'for', 'and', 'but', 'okay', 'how', 'or', 'why', 'where', 'what', 
    'the', 'a', 'an', 'that', 'this', 'was', 'were', 'are', 'am', 'i', 'you', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 
    'your', 'our', 'their', 'mine', 'yours', 'ours', 'theirs','will','so',"i'm",'like',"it's",'not','now','be','omitted','media','bt',
    'know','wat','have','cz','then','do','on','no','too','if','ok','ur','about','just',"dont",'kuti']);
    
    // Simple word tokenization
    const words = text.toLowerCase().match(/\b[\w']+\b/g) || [];
    
    words.forEach(word => {
        if (word.length < 2 || stopWords.has(word)) return;
        
        if (!wordFrequency[word]) {
            wordFrequency[word] = 0;
        }
        wordFrequency[word]++;
    });
    
    // Simple emoji detection
    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojis = text.match(emojiRegex) || [];
    
    emojis.forEach(emoji => {
        if (!emojiFrequency[emoji]) {
            emojiFrequency[emoji] = 0;
        }
        emojiFrequency[emoji]++;
        
        if (!userEmojis[emoji]) {
            userEmojis[emoji] = 0;
        }
        userEmojis[emoji]++;
    });
}

function analyzeSentiment(text) {
    const positiveWords = [
        'good', 'great', 'excellent', 'awesome', 'wonderful', 'happy', 'love', 'like', 'nice', 'best', 'amazing', 'fantastic', 
        'perfect', 'beautiful', 'fun', 'joy', 'pleasure', 'smile', 'laugh', 'success'
    ];
    const negativeWords = [
        'bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible', 'worst', 'sad', 'angry', 'upset', 'annoying', 'hate', 'problem',
            'issue', 'wrong', 'fail', 'failure', 'disappoint', 'cry', 'mad'
    ];
    
    const words = text.toLowerCase().match(/\b[\w']+\b/g) || [];
    let score = 0;
    
    words.forEach(word => {
        if (positiveWords.includes(word)) {
            score += 1;
        } else if (negativeWords.includes(word)) {
            score -= 1;
        }
    });
    
    // Normalize score based on text length
    if (words.length > 0) {
        score = score / words.length;
    }
    
    return {
        score: score,
        comparative: score,
        words: words
    };
}

function prepareTimeSeriesData(dailyActivity) {
    // Filter out future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    
    const filteredDates = Object.keys(dailyActivity)
        .filter(dateStr => {
            const date = new Date(dateStr);
            return date.getTime() <= todayTime;
        })
        .sort();
        
    const values = filteredDates.map(date => dailyActivity[date]);
    
    return {
        labels: filteredDates,
        values: values
    };
}

function calculateFirstMessageStats(firstMessageOfDay) {
    const stats = {};
    
    Object.values(firstMessageOfDay).forEach(sender => {
        if (!stats[sender]) {
            stats[sender] = 0;
        }
        stats[sender]++;
    });
    
    return stats;
}

function visualizeResults(analysis) {
    if (!analysis) return;
    
    // Update summary cards
    document.getElementById('mostActiveUser').textContent = analysis.mostActiveUser;
    document.getElementById('totalMessages').textContent = analysis.totalMessages.toLocaleString();
    document.getElementById('mostPositive').textContent = analysis.mostPositiveUser;
    
    const startDate = new Date(analysis.dateRange.start).toLocaleDateString();
    const endDate = new Date(analysis.dateRange.end).toLocaleDateString();
    document.getElementById('analysisPeriod').textContent = `${startDate} to ${endDate}`;
    
    // Create charts
    createActivityChart(analysis.timeSeries);
    createUserDistributionChart(analysis.users);
    createActiveHoursChart(analysis.activeHours);
    createWordCloud(analysis.wordFrequency);
    createDetailedStats(analysis.users, analysis.firstMessageStats);
    createChatAwards(analysis);
}

function createActivityChart(timeSeries) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    // Filter dates to only include those within the analysis period
    const filteredLabels = timeSeries.labels.filter(label => {
        const date = new Date(label);
        return date >= new Date(chatData[0].date) && date <= new Date(chatData[chatData.length - 1].date);
    });
    
    const filteredValues = filteredLabels.map(label => timeSeries.values[timeSeries.labels.indexOf(label)]);
    
    // Format dates properly with months and years
    const formattedLabels = filteredLabels.map(label => {
        const date = new Date(label);
        const options = { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        };
        return date.toLocaleDateString(undefined, options);
    });
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedLabels,
            datasets: [{
                label: 'Messages per Day',
                data: filteredValues,
                borderColor: 'rgb(79, 70, 229)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    currentCharts.push(chart);
}

function createUserDistributionChart(users) {
    const ctx = document.getElementById('userDistributionChart').getContext('2d');
    
    const userNames = Object.keys(users);
    const messageCounts = userNames.map(user => users[user].messageCount);
    
    // Generate colors for each user
    const backgroundColors = userNames.map((_, i) => {
        const hue = (i * 137.5) % 360; // Golden angle for distinct colors
        return `hsl(${hue}, 70%, 65%)`;
    });
    
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: userNames,
            datasets: [{
                data: messageCounts,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
    
    currentCharts.push(chart);
}

function createActiveHoursChart(activeHours) {
    const ctx = document.getElementById('activeHoursChart').getContext('2d');
    
    const labels = Array.from({length: 24}, (_, i) => {
        const hour = i % 12 || 12;
        const period = i < 12 ? 'AM' : 'PM';
        return `${hour} ${period}`;
    });
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Messages',
                data: activeHours,
                backgroundColor: 'rgba(79, 70, 229, 0.7)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    currentCharts.push(chart);
}

function createWordCloud(wordFrequency) {
    const container = document.getElementById('wordCloud');
    container.innerHTML = '';
    
    // Get top 10 words only
    const words = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0,10);
    
    if (words.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Not enough data to generate word cloud</p>';
        return;
    }
    
    const maxFreq = words[0][1];
    const minFreq = words[words.length - 1][1];
    
    words.forEach(([word, freq]) => {

        const size = 14 + (Math.log(freq) / Math.log(maxFreq)) * 30;
        
        const wordContainer = document.createElement('div');
        wordContainer.className = 'word';
        wordContainer.style.fontSize = `${size}px`;
        wordContainer.style.opacity = 0.7 + (0.3 * (freq - minFreq) / (maxFreq - minFreq));
        wordContainer.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 80%)`;
        
        const wordSpan = document.createElement('span');
        wordSpan.textContent = word;
        
        const countSpan = document.createElement('span');
        countSpan.className = 'word-count';
        countSpan.textContent = `(${freq})`;
        
        wordContainer.appendChild(wordSpan);
        wordContainer.appendChild(countSpan);
        container.appendChild(wordContainer);
    });
}

function createDetailedStats(users, firstMessageStats) {
    const container = document.getElementById('detailedStats');
    
    let html = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Messages</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sentiment</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    Object.entries(users).forEach(([user, stats]) => {
        html += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap font-medium">${user}</td>
                <td class="px-6 py-4 whitespace-nowrap">${stats.messageCount}</td>
                <td class="px-6 py-4 whitespace-nowrap">${firstMessageStats[user] || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap">${stats.avgSentiment.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function createChatAwards(analysis) {
    const container = document.getElementById('chatAwards');
    const users = analysis.users;

    let mostCaring = { name: '', score: -Infinity };
    let fastestReplier = { name: '', score: Infinity };
    let longestMessages = { name: '', score: -Infinity };
    let mostEmojis = { name: '', score: -Infinity };
    
    Object.entries(users).forEach(([user, stats]) => {
        // Most caring (based on positive sentiment)
        if (stats.avgSentiment > mostCaring.score) {
            mostCaring = { name: user, score: stats.avgSentiment };
        }
        
        // Fastest replier (based on average response time)
        if (stats.avgResponseTime && stats.avgResponseTime < fastestReplier.score) {
            fastestReplier = { name: user, score: stats.avgResponseTime };
        }
        
        // Longest messages (based on average characters)
        if (stats.avgChars > longestMessages.score) {
            longestMessages = { name: user, score: stats.avgChars };
        }
        
        // Most emojis (based on emoji count)
        const emojiCount = Object.values(stats.emojis).reduce((sum, count) => sum + count, 0);
        if (emojiCount > mostEmojis.score) {
            mostEmojis = { name: user, score: emojiCount };
        }
    });

    const awards = [
        { title: 'Most Active', recipient: analysis.mostActiveUser, icon: 'fas fa-comment', color: 'bg-blue-100 text-blue-800' },
        { title: 'Most Positive', recipient: analysis.mostPositiveUser, icon: 'fas fa-smile', color: 'bg-green-100 text-green-800' },
        { title: 'Most Caring', recipient: mostCaring.name, icon: 'fas fa-heart', color: 'bg-pink-100 text-pink-800' },
        { title: 'Fastest Replier', recipient: fastestReplier.name, icon: 'fas fa-stopwatch', color: 'bg-yellow-100 text-yellow-800' },
        { title: 'Most Detailed', recipient: longestMessages.name, icon: 'fas fa-align-left', color: 'bg-purple-100 text-purple-800' },
        { title: 'Most Expressive', recipient: mostEmojis.name, icon: 'fas fa-laugh', color: 'bg-orange-100 text-orange-800' }
    ];
    
    let html = '';
    
    awards.forEach(award => {
        if (award.recipient) {
            html += `
                <div class="card bg-white rounded-lg shadow p-4 flex items-center">
                    <div class="${award.color} p-3 rounded-full mr-4">
                        <i class="${award.icon} text-xl"></i>
                    </div>
                    <div>
                        <h3 class="font-semibold">${award.title}</h3>
                        <p class="text-lg">${award.recipient}</p>
                    </div>
                </div>
            `;
        }
    });
    container.innerHTML = html || '<p class="text-gray-500">Not enough data to generate awards</p>';
}
function toggleTheme() {
    if (isDarkMode) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
}
function enableDarkMode() {
    document.body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    isDarkMode = true;
    localStorage.setItem('darkMode', 'true');
}
function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    isDarkMode = false;
    localStorage.setItem('darkMode', 'false');
}