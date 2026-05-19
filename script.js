let pyodide = null;
let pyodideReady = false;
let editors = {};
let currentOutputElement = null;

async function loadPyodideRuntime() {
    if (pyodideReady) return;
    
    try {
        console.log('正在加载 Pyodide...');
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
        });
        
        pyodide.globals.set("console", {
            log: (...args) => {
                if (currentOutputElement) {
                    currentOutputElement.textContent += args.map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                    ).join(' ') + '\n';
                }
                console.log(...args);
            }
        });
        
        pyodideReady = true;
        console.log('Pyodide 加载完成');
    } catch (error) {
        console.error('Pyodide 加载失败:', error);
        if (currentOutputElement) {
            currentOutputElement.textContent = 'Pyodide 加载失败: ' + error.message;
            currentOutputElement.classList.add('error');
        }
    }
}

async function runPythonCode(code, outputElement) {
    currentOutputElement = outputElement;
    outputElement.textContent = '';
    outputElement.classList.remove('error', 'success');

    if (!pyodideReady) {
        outputElement.textContent = '正在加载 Python 运行时...\n';
        await loadPyodideRuntime();
    }

    if (!pyodide) {
        outputElement.textContent = '错误: Pyodide 未加载成功';
        outputElement.classList.add('error');
        currentOutputElement = null;
        return;
    }

    try {
        outputElement.textContent = '';
        
        const oldStdout = pyodide.globals.get("sys").stdout;
        const oldStderr = pyodide.globals.get("sys").stderr;
        
        const stringIO = pyodide.globals.get("io").StringIO.new();
        pyodide.globals.get("sys").stdout = stringIO;
        pyodide.globals.get("sys").stderr = stringIO;

        try {
            await pyodide.runPythonAsync(code);
        } finally {
            pyodide.globals.get("sys").stdout = oldStdout;
            pyodide.globals.get("sys").stderr = oldStderr;
        }

        const output = stringIO.getvalue();
        
        if (output.trim() === '') {
            outputElement.textContent = '(无输出)';
        } else {
            outputElement.textContent = output;
            outputElement.classList.add('success');
        }
    } catch (error) {
        outputElement.classList.add('error');
        outputElement.textContent = '错误: ' + error.message;
        console.error('Python 执行错误:', error);
    } finally {
        currentOutputElement = null;
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
    console.log('初始化编辑器:', textareaId);
    return editor;
}

function runCode(blockId) {
    const inputId = 'code-input-' + blockId.split('-').slice(1).join('-');
    const outputId = 'output' + blockId.slice(4);
    
    console.log('runCode:', blockId, inputId, outputId);
    
    const editor = editors[inputId];
    const code = editor ? editor.getValue() : document.getElementById(inputId)?.value;
    const outputElement = document.getElementById(outputId);
    
    console.log('代码:', code);
    console.log('输出元素:', outputElement);
    
    if (outputElement && code !== undefined) {
        runPythonCode(code, outputElement);
    }
}

function runExercise(exerciseId) {
    const inputId = exerciseId + '-input';
    const outputId = exerciseId + '-output';
    
    console.log('runExercise:', exerciseId, inputId, outputId);
    
    const editor = editors[inputId];
    const code = editor ? editor.getValue() : document.getElementById(inputId)?.value;
    const outputElement = document.getElementById(outputId);
    
    console.log('代码:', code);
    console.log('输出元素:', outputElement);
    
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
    console.log('找到 textarea 数量:', textareas.length);
    textareas.forEach(textarea => {
        initEditor(textarea.id);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 加载完成');
    initAllEditors();
    initCourseNavigation();
    loadPyodideRuntime();
});