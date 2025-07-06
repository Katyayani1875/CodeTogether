// src/components/Editor.jsx
import React from 'react';
import MonacoEditor from '@monaco-editor/react';

// --- UPDATED: The component now accepts an 'onMount' prop ---
const Editor = ({ value, onChange, onMount, language }) => {
    return (
        <MonacoEditor
            // Use 100% height to ensure it fills its parent container correctly.
            // This is more flexible than a fixed '100vh'.
            height="100%" 
            language={language || 'javascript'}
            theme="vs-dark"
            value={value}
            onChange={onChange} // Pass the onChange handler directly.
            onMount={onMount}   // --- NEW: Pass the onMount prop to the underlying editor.
            loading={
                <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
                    Loading Editor...
                </div>
            }
            options={{
                selectOnLineNumbers: true,
                automaticLayout: true,
                minimap: { enabled: true },
                wordWrap: 'on', // A nice quality-of-life improvement
                scrollBeyondLastLine: false, // Prevents excessive scrolling
                fontSize: 14,
                lineHeight: 24,
                padding: {
                    top: 16,
                    bottom: 16,
                },
            }}
        />
    );
};

export default Editor;
// // src/components/Editor.jsx
// import React from 'react';
// import MonacoEditor from '@monaco-editor/react';

// const Editor = ({ value, onChange, language }) => {
    
//     function handleEditorChange(value) {
//         onChange(value);
//     }

//     return (
//         <MonacoEditor
//             height="100vh"
//             language={language || 'javascript'}
//             theme="vs-dark"
//             value={value}
//             onChange={handleEditorChange}
//             loading={<div className="text-white text-center">Loading Editor...</div>}
//             options={{
//                 selectOnLineNumbers: true,
//                 automaticLayout: true,
//                 minimap: { enabled: true },
//             }}
//         />
//     );
// };

// export default Editor;