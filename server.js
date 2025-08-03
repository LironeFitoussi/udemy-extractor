const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper functions (same as in index.js)
function durationToMinutes(durationStr) {
    if (!durationStr || durationStr === '0min') return 0;
    
    const hourMatch = durationStr.match(/(\d+)hr/);
    const minMatch = durationStr.match(/(\d+)min/);
    
    let totalMinutes = 0;
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) totalMinutes += parseInt(minMatch[1]);
    
    return totalMinutes;
}

function formatDuration(minutes) {
    if (minutes === 0) return '0min';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
        return `${hours}hr ${mins}min`;
    } else if (hours > 0) {
        return `${hours}hr`;
    } else {
        return `${mins}min`;
    }
}

function calculateStats(courseData) {
    let totalLessons = 0;
    let completedLessons = 0;
    let totalMinutes = 0;
    let completedMinutes = 0;
    
    courseData.lessons.forEach(lesson => {
        totalLessons++;
        const minutes = durationToMinutes(lesson.duration);
        totalMinutes += minutes;
        
        if (lesson.isDone) {
            completedLessons++;
            completedMinutes += minutes;
        }
    });
    
    const remainingMinutes = totalMinutes - completedMinutes;
    const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const timeCompletionPercentage = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0;
    
    return {
        totalLessons,
        completedLessons,
        lessonsRemaining: totalLessons - completedLessons,
        totalTime: formatDuration(totalMinutes),
        completedTime: formatDuration(completedMinutes),
        remainingTime: formatDuration(remainingMinutes),
        completionPercentage,
        timeCompletionPercentage
    };
}

function getSectionStats(courseData) {
    const sectionMap = new Map();
    
    courseData.lessons.forEach(lesson => {
        if (!sectionMap.has(lesson.section)) {
            sectionMap.set(lesson.section, { total: 0, completed: 0 });
        }
        const section = sectionMap.get(lesson.section);
        section.total++;
        if (lesson.isDone) section.completed++;
    });
    
    return Array.from(sectionMap.entries()).map(([name, stats]) => ({
        name,
        completed: stats.completed,
        total: stats.total,
        percentage: Math.round((stats.completed / stats.total) * 100)
    }));
}

// API Routes
app.get('/api/course', (req, res) => {
    try {
        const courseData = JSON.parse(fs.readFileSync('course-structure.json', 'utf8'));
        const stats = calculateStats(courseData);
        const sectionStats = getSectionStats(courseData);
        
        res.json({
            ...courseData,
            statistics: stats,
            sectionStats: sectionStats
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load course data' });
    }
});

app.put('/api/lesson/:numbering', (req, res) => {
    try {
        const { numbering } = req.params;
        const { isDone } = req.body;
        
        const courseData = JSON.parse(fs.readFileSync('course-structure.json', 'utf8'));
        
        // Find and update the lesson
        const lesson = courseData.lessons.find(l => l.numbering === parseInt(numbering));
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        
        lesson.isDone = isDone;
        
        // Update summary statistics
        const stats = calculateStats(courseData);
        courseData.summary = {
            totalLessons: stats.totalLessons,
            completedLessons: stats.completedLessons,
            lessonsRemaining: stats.lessonsRemaining,
            totalTime: stats.totalTime,
            completedTime: stats.completedTime,
            remainingTime: stats.remainingTime,
            lessonProgress: `${stats.completionPercentage}%`,
            timeProgress: `${stats.timeCompletionPercentage}%`
        };
        
        // Save back to file
        fs.writeFileSync('course-structure.json', JSON.stringify(courseData, null, 2));
        
        // Return updated stats
        const sectionStats = getSectionStats(courseData);
        res.json({
            lesson,
            statistics: stats,
            sectionStats: sectionStats
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update lesson' });
    }
});

app.put('/api/section/:sectionName', (req, res) => {
    try {
        const { sectionName } = req.params;
        const { isDone } = req.body;
        
        const courseData = JSON.parse(fs.readFileSync('course-structure.json', 'utf8'));
        
        // Update all lessons in the section
        const updatedLessons = courseData.lessons.filter(lesson => 
            lesson.section === decodeURIComponent(sectionName)
        );
        
        if (updatedLessons.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        updatedLessons.forEach(lesson => {
            lesson.isDone = isDone;
        });
        
        // Update summary statistics
        const stats = calculateStats(courseData);
        courseData.summary = {
            totalLessons: stats.totalLessons,
            completedLessons: stats.completedLessons,
            lessonsRemaining: stats.lessonsRemaining,
            totalTime: stats.totalTime,
            completedTime: stats.completedTime,
            remainingTime: stats.remainingTime,
            lessonProgress: `${stats.completionPercentage}%`,
            timeProgress: `${stats.timeCompletionPercentage}%`
        };
        
        // Save back to file
        fs.writeFileSync('course-structure.json', JSON.stringify(courseData, null, 2));
        
        // Return updated stats
        const sectionStats = getSectionStats(courseData);
        res.json({
            updatedCount: updatedLessons.length,
            statistics: stats,
            sectionStats: sectionStats
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update section' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Course Progress Tracker Server running at http://localhost:${PORT}`);
    console.log(`📊 Interactive dashboard available at http://localhost:${PORT}`);
    console.log(`🔧 API endpoints:`);
    console.log(`   GET  /api/course - Get course data with statistics`);
    console.log(`   PUT  /api/lesson/:numbering - Update lesson progress`);
    console.log(`   PUT  /api/section/:sectionName - Update entire section`);
});