// src/components/Editor.jsx
import React from 'react';
import MonacoEditor from '@monaco-editor/react';

const Editor = ({ value, onChange, language }) => {
    
    function handleEditorChange(value) {
        onChange(value);
    }

    return (
        <MonacoEditor
            height="100vh"
            language={language || 'javascript'}
            theme="vs-dark"
            value={value}
            onChange={handleEditorChange}
            loading={<div className="text-white text-center">Loading Editor...</div>}
            options={{
                selectOnLineNumbers: true,
                automaticLayout: true,
                minimap: { enabled: true },
            }}
        />
    );
};

export default Editor;