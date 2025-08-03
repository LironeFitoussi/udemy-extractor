# Udemy Course Extractor

This tool extracts the course structure from a Udemy course HTML file and generates a clean markdown file with all sections and lessons.

## Features

- ✅ Extracts course sections and their titles
- ✅ Extracts individual lessons with titles and durations
- ✅ Identifies video lessons with 🎥 icons
- ✅ Shows section durations and completion status
- ✅ Generates clean, organized markdown output

## Installation

1. Make sure you have Node.js installed
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Place your Udemy course HTML file as `source.html` in the project directory
2. Run the extractor:
   ```bash
   npm start
   # or
   node index.js
   ```
3. The script will generate `course-structure.md` with the extracted course structure

## Output

The script generates a markdown file with:
- Course sections as level 2 headers (##)
- Individual lessons as level 3 headers (###)
- Video lessons marked with 🎥 icons
- Duration information for both sections and lessons
- Clean formatting with separators between sections

## Example Output

```markdown
# Course Structure

## Section 1: Introduction
*Duration: 4 / 4 | 15min*

### 🎥 1. Welcome!
*Duration: 3min*

### 🎥 2. What is Raspberry Pi and what can you do with it?
*Duration: 4min*

---
```

## Requirements

- Node.js (v14 or higher)
- `jsdom` library (automatically installed via npm)

## Files

- `index.js` - Main extraction script
- `source.html` - Input HTML file (you need to provide this)
- `course-structure.md` - Generated output file
- `package.json` - Project configuration and dependencies 