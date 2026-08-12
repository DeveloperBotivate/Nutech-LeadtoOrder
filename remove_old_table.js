const fs = require('fs');
const content = fs.readFileSync('src/pages/FollowUp.jsx', 'utf8');
const lines = content.split('\n');

const startIdx = lines.findIndex((l, i) => i > 900 && l.includes('                    {/* Mobile Card View */}'));

let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes('              </>')) {
        endIdx = i - 1; 
        break;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    console.log('Start index:', startIdx);
    console.log('End index:', endIdx);
    const newLines = [...lines.slice(0, startIdx), ...lines.slice(endIdx + 1)];
    fs.writeFileSync('src/pages/FollowUp.jsx', newLines.join('\n'));
    console.log('Successfully deleted the old tables.');
} else {
    console.log('Indices not found:', startIdx, endIdx);
}
