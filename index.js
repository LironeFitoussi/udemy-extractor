const fs = require('fs');
const { JSDOM } = require('jsdom');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Read the HTML file
const htmlContent = fs.readFileSync('source.html', 'utf8');
const dom = new JSDOM(htmlContent);
const document = dom.window.document;

// Function to clean text by removing extra whitespace and line breaks
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
        .replace(/\n/g, ' ')   // Replace line breaks with spaces
        .replace(/\r/g, ' ')   // Replace carriage returns with spaces
        .trim();               // Remove leading/trailing whitespace
}

// Function to extract lesson number from title
function extractLessonNumber(title) {
    const match = title.match(/^(\d+)\./);
    return match ? parseInt(match[1]) : null;
}

// Function to remove numbering from lesson title
function removeNumbering(title) {
    return title.replace(/^\d+\.\s*/, '').trim();
}

// Function to extract duration from lesson item
function extractDuration(lessonItem) {
    const metadataElement = lessonItem.querySelector('.curriculum-item-link--metadata--XK804');
    if (metadataElement) {
        const durationSpan = metadataElement.querySelector('span');
        if (durationSpan && durationSpan.textContent) {
            return durationSpan.textContent.trim();
        }
    }
    return '0min'; // Default fallback
}

// Function to convert duration string to minutes
function durationToMinutes(durationStr) {
    if (!durationStr || durationStr === '0min') return 0;
    
    // Handle different formats: "5min", "1hr 30min", "2hr", etc.
    const hourMatch = durationStr.match(/(\d+)hr/);
    const minMatch = durationStr.match(/(\d+)min/);
    
    let totalMinutes = 0;
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) totalMinutes += parseInt(minMatch[1]);
    
    return totalMinutes;
}

// Function to format minutes back to readable duration
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

// Function to calculate statistics
function calculateStats(courseStructure) {
    let totalLessons = 0;
    let completedLessons = 0;
    let totalMinutes = 0;
    let completedMinutes = 0;
    
    courseStructure.forEach(section => {
        section.lessons.forEach(lesson => {
            totalLessons++;
            const minutes = durationToMinutes(lesson.duration);
            totalMinutes += minutes;
            
            if (lesson.isDone) {
                completedLessons++;
                completedMinutes += minutes;
            }
        });
    });
    
    const remainingMinutes = totalMinutes - completedMinutes;
    const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const timeCompletionPercentage = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0;
    
    return {
        totalLessons,
        completedLessons,
        totalTime: formatDuration(totalMinutes),
        completedTime: formatDuration(completedMinutes),
        remainingTime: formatDuration(remainingMinutes),
        completionPercentage,
        timeCompletionPercentage
    };
}

// Function to extract course structure
function extractCourseStructure() {
    const courseStructure = [];
    let globalLessonNumber = 1;
    
    // Find all section panels
    const sectionPanels = document.querySelectorAll('[data-purpose^="section-panel-"]');
    
    sectionPanels.forEach((sectionPanel, sectionIndex) => {
        // Extract section title
        const sectionHeading = sectionPanel.querySelector('[data-purpose="section-heading"]');
        const sectionTitleElement = sectionHeading?.querySelector('.ud-accordion-panel-title');
        const sectionTitle = cleanText(sectionTitleElement?.textContent) || `Section ${sectionIndex + 1}`;
        
        const section = {
            title: sectionTitle,
            lessons: []
        };
        
        // Find all lessons in this section
        const lessonItems = sectionPanel.querySelectorAll('[data-purpose^="curriculum-item-"]');
        
        lessonItems.forEach((lessonItem) => {
            // Extract lesson title
            const lessonTitleElement = lessonItem.querySelector('[data-purpose="item-title"]');
            const lessonTitle = cleanText(lessonTitleElement?.textContent) || 'Untitled Lesson';
            
            // Extract duration
            const duration = extractDuration(lessonItem);
            
            // Extract completion status from checkbox
            const checkbox = lessonItem.querySelector('input[data-purpose="progress-toggle-button"]');
            const isDone = checkbox ? checkbox.checked : false;
            
            section.lessons.push({
                title: lessonTitle,
                duration: duration,
                isDone: isDone,
                globalNumber: globalLessonNumber++
            });
        });
        
        courseStructure.push(section);
    });
    
    return courseStructure;
}

// Function to generate table markdown
function generateTableMarkdown(courseStructure) {
    let markdown = '# Course Structure Table\n\n';
    
    // Calculate statistics
    const stats = calculateStats(courseStructure);
    
    // Add summary statistics
    markdown += '## Progress Summary\n\n';
    markdown += '| Metric | Value |\n';
    markdown += '|-----------|-------|\n';
    markdown += `| Total Lessons | ${stats.totalLessons} |\n`;
    markdown += `| Completed Lessons | ${stats.completedLessons} |\n`;
    markdown += `| Lessons Remaining | ${stats.totalLessons - stats.completedLessons} |\n`;
    markdown += `| Total Duration | ${stats.totalTime} |\n`;
    markdown += `| Time Completed | ${stats.completedTime} |\n`;
    markdown += `| Time Remaining | ${stats.remainingTime} |\n`;
    markdown += `| Lesson Progress | ${stats.completionPercentage}% |\n`;
    markdown += `| Time Progress | ${stats.timeCompletionPercentage}% |\n\n`;
    
    // Course structure table
    markdown += '## Course Structure\n\n';
    markdown += '| Section | Lesson | Numbering | Duration | Is Done |\n';
    markdown += '|---------|--------|-----------|----------|---------|\n';
    
    // Table rows
    courseStructure.forEach((section) => {
        section.lessons.forEach((lesson) => {
            const lessonTitleWithoutNumber = removeNumbering(lesson.title);
            
            markdown += `| ${section.title} | ${lessonTitleWithoutNumber} | ${lesson.globalNumber} | ${lesson.duration} | ${lesson.isDone ? 'TRUE' : 'FALSE'} |\n`;
        });
    });
    
    return markdown;
}

// Function to generate CSV format using csv-writer library
function generateCSV(courseStructure) {
    // Configure CSV writer
    const csvWriter = createCsvWriter({
        path: 'course-structure.csv',
        header: [
            { id: 'section', title: 'Section' },
            { id: 'lesson', title: 'Lesson' },
            { id: 'numbering', title: 'Numbering' },
            { id: 'duration', title: 'Duration' },
            { id: 'isDone', title: 'Is Done' }
        ]
    });
    
    // Prepare data for CSV
    const records = [];
    courseStructure.forEach((section) => {
        section.lessons.forEach((lesson) => {
            const lessonTitleWithoutNumber = removeNumbering(lesson.title);
            
            records.push({
                section: section.title,
                lesson: lessonTitleWithoutNumber,
                numbering: lesson.globalNumber,
                duration: lesson.duration,
                isDone: lesson.isDone
            });
        });
    });
    
    return { csvWriter, records };
}

// Function to generate JSON format
function generateJSON(courseStructure) {
    const stats = calculateStats(courseStructure);
    const tableData = [];
    
    courseStructure.forEach((section) => {
        section.lessons.forEach((lesson) => {
            const lessonTitleWithoutNumber = removeNumbering(lesson.title);
            
            tableData.push({
                section: section.title,
                lesson: lessonTitleWithoutNumber,
                numbering: lesson.globalNumber,
                duration: lesson.duration,
                isDone: lesson.isDone
            });
        });
    });
    
    const result = {
        summary: {
            totalLessons: stats.totalLessons,
            completedLessons: stats.completedLessons,
            lessonsRemaining: stats.totalLessons - stats.completedLessons,
            totalTime: stats.totalTime,
            completedTime: stats.completedTime,
            remainingTime: stats.remainingTime,
            lessonProgress: `${stats.completionPercentage}%`,
            timeProgress: `${stats.timeCompletionPercentage}%`
        },
        lessons: tableData
    };
    
    return JSON.stringify(result, null, 2);
}

// Main execution
async function main() {
    try {
        console.log('Extracting course structure from HTML...');
        const courseStructure = extractCourseStructure();
        
        console.log(`Found ${courseStructure.length} sections with ${courseStructure.reduce((total, section) => total + section.lessons.length, 0)} total lessons`);
        
        // Generate different formats
        const tableMarkdown = generateTableMarkdown(courseStructure);
        const { csvWriter, records } = generateCSV(courseStructure);
        const jsonData = generateJSON(courseStructure);
        
        // Write files
        fs.writeFileSync('course-structure-table.md', tableMarkdown, 'utf8');
        await csvWriter.writeRecords(records);
        fs.writeFileSync('course-structure.json', jsonData, 'utf8');
        
        console.log('✅ Course structure has been extracted and saved to multiple formats:');
        console.log('  📄 course-structure-table.md (Markdown table with progress summary)');
        console.log('  📊 course-structure.csv (CSV format using csv-writer)');
        console.log('  🔧 course-structure.json (JSON format with progress summary)');
        
        // Display progress statistics
        const stats = calculateStats(courseStructure);
        console.log('\n📈 Progress Statistics:');
        console.log(`  Total Lessons: ${stats.totalLessons}`);
        console.log(`  Completed: ${stats.completedLessons} (${stats.completionPercentage}%)`);
        console.log(`  Remaining: ${stats.totalLessons - stats.completedLessons}`);
        console.log(`  Total Duration: ${stats.totalTime}`);
        console.log(`  Time Completed: ${stats.completedTime} (${stats.timeCompletionPercentage}%)`);
        console.log(`  Time Remaining: ${stats.remainingTime}`);
        
        console.log('\n📊 Section Summary:');
        courseStructure.forEach((section, index) => {
            const completedInSection = section.lessons.filter(lesson => lesson.isDone).length;
            console.log(`  Section ${index + 1}: ${section.title} (${completedInSection}/${section.lessons.length} completed)`);
        });
        
    } catch (error) {
        console.error('❌ Error extracting course structure:', error.message);
        process.exit(1);
    }
}

// Run the main function
main();
