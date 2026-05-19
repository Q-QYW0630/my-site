let pyodide = null;
let pyodideReady = false;
let editors = {};

async function loadPyodideRuntime() {
    if (pyodideReady) return;
    
    try {
        console.log('正在加载 Pyodide...');
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
        });
        
        await pyodide.runPythonAsync(`
import sys
import io
`);
        
        pyodideReady = true;
        console.log('Pyodide 加载完成');
    } catch (error) {
        console.error('Pyodide 加载失败:', error);
    }
}

async function runPythonCode(code, outputElement) {
    outputElement.textContent = '';
    outputElement.classList.remove('error', 'success');

    if (!pyodideReady) {
        outputElement.textContent = '正在加载 Python 运行时...';
        await loadPyodideRuntime();
    }

    if (!pyodide) {
        outputElement.textContent = '错误: Pyodide 未加载成功';
        outputElement.classList.add('error');
        return;
    }

    try {
        await pyodide.runPythonAsync(`
import sys
import io

output_buffer = io.StringIO()
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = output_buffer
sys.stderr = output_buffer

try:
    exec(${JSON.stringify(code)})
finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr

output = output_buffer.getvalue()
`);
        
        const output = pyodide.globals.get("output");
        
        if (output && output.trim()) {
            outputElement.textContent = output;
            outputElement.classList.add('success');
        } else {
            outputElement.textContent = '(无输出)';
        }
    } catch (error) {
        outputElement.classList.add('error');
        outputElement.textContent = '错误: ' + error.message;
        console.error('Python 执行错误:', error);
    }
}

function initEditor(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) {
        console.log('未找到 textarea:', textareaId);
        return;
    }

    const editor = CodeMirror.fromTextArea(textarea, {
        mode: 'python',
        theme: 'monokai',
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        lineWrapping: true,
        extraKeys: {
            'Ctrl-Enter': function(cm) {
                const button = textarea.parentElement.parentElement.querySelector('.run-code-btn');
                if (button) button.click();
            }
        }
    });

    editor.setSize('100%', 'auto');
    editor.on('change', function() {
        textarea.value = editor.getValue();
    });

    editors[textareaId] = editor;
    return editor;
}

function runCode(blockId) {
    const inputId = 'code-input-' + blockId.split('-').slice(1).join('-');
    const outputId = 'output' + blockId.slice(4);
    
    const editor = editors[inputId];
    const code = editor ? editor.getValue() : document.getElementById(inputId)?.value;
    const outputElement = document.getElementById(outputId);
    
    if (outputElement && code !== undefined) {
        runPythonCode(code, outputElement);
    }
}

function runExercise(exerciseId) {
    const inputId = exerciseId + '-input';
    const outputId = exerciseId + '-output';
    
    const editor = editors[inputId];
    const code = editor ? editor.getValue() : document.getElementById(inputId)?.value;
    const outputElement = document.getElementById(outputId);
    
    if (outputElement && code !== undefined) {
        runPythonCode(code, outputElement);
    } else {
        console.error('缺少必要元素:', {inputId, outputId, code, outputElement});
    }
}

function showChapter(chapterNum) {
    document.querySelectorAll('.chapter-content').forEach(chapter => {
        chapter.style.display = 'none';
    });
    document.getElementById('chapter' + chapterNum).style.display = 'block';

    document.querySelectorAll('.course-nav a').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`.course-nav a[data-chapter="${chapterNum}"]`)?.classList.add('active');
}

function initCourseNavigation() {
    const courseNav = document.getElementById('courseNav');
    if (!courseNav) return;

    courseNav.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link) {
            e.preventDefault();
            const chapterNum = link.getAttribute('data-chapter');
            showChapter(chapterNum);
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const chapter = urlParams.get('chapter');
    if (chapter) {
        showChapter(chapter);
    } else {
        showChapter(1);
    }
}

function initAllEditors() {
    const textareas = document.querySelectorAll('textarea.code-input');
    textareas.forEach(textarea => {
        initEditor(textarea.id);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initAllEditors();
    initCourseNavigation();
    loadPyodideRuntime();
});