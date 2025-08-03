const fs = require('fs');
const { JSDOM } = require('jsdom');

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

// Function to extract course structure
function extractCourseStructure() {
    const courseStructure = [];
    
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
            
            section.lessons.push({
                title: lessonTitle
            });
        });
        
        courseStructure.push(section);
    });
    
    return courseStructure;
}

// Function to generate simplified markdown
function generateMarkdown(courseStructure) {
    let markdown = '# Course Structure\n\n';
    
    courseStructure.forEach((section, sectionIndex) => {
        // Section header
        markdown += `## ${section.title}\n\n`;
        
        // Lessons in the section
        section.lessons.forEach((lesson) => {
            markdown += `${lesson.title}\n`;
        });
        
        markdown += '\n';
    });
    
    return markdown;
}

// Main execution
try {
    console.log('Extracting course structure from HTML...');
    const courseStructure = extractCourseStructure();
    
    console.log(`Found ${courseStructure.length} sections with ${courseStructure.reduce((total, section) => total + section.lessons.length, 0)} total lessons`);
    
    const markdown = generateMarkdown(courseStructure);
    
    // Write to file
    fs.writeFileSync('course-structure.md', markdown, 'utf8');
    
    console.log('✅ Course structure has been extracted and saved to course-structure.md');
    console.log('\n📊 Summary:');
    courseStructure.forEach((section, index) => {
        console.log(`  Section ${index + 1}: ${section.title} (${section.lessons.length} lessons)`);
    });
    
} catch (error) {
    console.error('❌ Error extracting course structure:', error.message);
    process.exit(1);
}
