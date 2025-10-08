import os
import json
import re

# === CONFIG ===
INPUT_FILE = "lessons.json"   # Path to your JSON file
OUTPUT_DIR = "Course"         # Root folder to create everything in

# === HELPERS ===
def sanitize_name(name: str) -> str:
    """Remove or replace illegal filesystem characters."""
    return re.sub(r'[<>:"/\\|?*]', '', name).strip()

# === MAIN ===
def main():
    # Load JSON
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    lessons = data.get("lessons", [])
    print(f"Loaded {len(lessons)} lessons.")

    # Group by section
    sections = {}
    for lesson in lessons:
        section = lesson["section"]
        sections.setdefault(section, []).append(lesson)

    # Create folder structure
    for section_name, lessons_list in sections.items():
        sanitized_section = sanitize_name(section_name)
        section_path = os.path.join(OUTPUT_DIR, sanitized_section)
        os.makedirs(section_path, exist_ok=True)

        print(f"Created folder: {section_path}")

        # Create markdown files
        for lesson in lessons_list:
            numbering = lesson.get("numbering", "")
            lesson_name = sanitize_name(lesson["lesson"])
            filename = f"{numbering:03d} - {lesson_name}.md"
            filepath = os.path.join(section_path, filename)

            with open(filepath, "w", encoding="utf-8") as md:
                md.write(f"# {lesson['lesson']}\n")
                md.write(f"**Duration:** {lesson['duration']}\n\n")
                md.write(f"**Completed:** {'Yes' if lesson['isDone'] else 'No'}\n")

            print(f"   Created: {filename}")

    print("\nAll folders and lesson files created successfully!")

if __name__ == "__main__":
    main()
