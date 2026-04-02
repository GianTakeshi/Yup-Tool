let extractedData = [];
let exportFileNameBase = "yupoo";

async function initialize() {
    const userTag = document.getElementById('userTag');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
            const url = new URL(tab.url);
            const subDomain = url.hostname.split('.')[0].toLowerCase();

            if (subDomain.includes("wd5888")) {
                exportFileNameBase = "Lee";
                userTag.innerText = `ヾ(≧▽≦*)o Hi 春秋`;
                userTag.style.color = "#007aff"; 
            } else if (subDomain.includes("chunq5888")) {
                exportFileNameBase = "Gian";
                userTag.innerText = `ヾ(≧▽≦*)o Hi Gian`;
                userTag.style.color = "#007aff";
            } else if (subDomain.includes("91851866")) {
                exportFileNameBase = "Jua";
                userTag.innerText = `ヾ(≧▽≦*)o Hi Jua`;
                userTag.style.color = "#007aff";
            } else {
                exportFileNameBase = "Other";
                userTag.innerText = "(一一) 别碰我";
                userTag.style.color = "#8e8e93"; 
            }
        }
    } catch (e) { userTag.innerText = "识别失败"; }
}

document.addEventListener('DOMContentLoaded', () => {
    initialize();

    const smartInput = document.getElementById('smartInput');
    const extractBtn = document.getElementById('extractBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const displayBox = document.getElementById('resultList');

    // 实时强制大写
    smartInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    extractBtn.addEventListener('click', async () => {
        const val = smartInput.value.trim().toUpperCase();
        
        // --- 智能解析：提取字母前缀和数字范围 ---
        const prefixMatch = val.match(/^[A-Z]+/);
        const numMatch = val.match(/\d+/g);

        if (!prefixMatch || !numMatch || numMatch.length < 2) {
            displayBox.innerText = "格式不对哦\n请按这种输入：CQ10-100";
            return;
        }

        const prefix = prefixMatch[0];
        const start = parseInt(numMatch[0]);
        const end = parseInt(numMatch[1]);

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        displayBox.innerText = `正在处理 ${prefix} ${start}-${end} ...`;

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractScopedTitles,
            args: [prefix, start, end]
        }, (results) => {
            if (results && results[0].result) {
                let data = results[0].result;
                
                // 排序逻辑保持不变
                data.sort((a, b) => {
                    const regex = /^([A-Za-z]+)(\d+)(D)?/i;
                    const matchA = a.match(regex), matchB = b.match(regex);
                    if (matchA && matchB) {
                        const fullA = matchA[1].toUpperCase(), fullB = matchB[1].toUpperCase();
                        let pureA = fullA.endsWith('D') ? fullA.slice(0, -1) : fullA;
                        let pureB = fullB.endsWith('D') ? fullB.slice(0, -1) : fullB;
                        const numA = parseInt(matchA[2]), numB = parseInt(matchB[2]);
                        if (pureA !== pureB) return pureA.localeCompare(pureB);
                        if (numA !== numB) return numA - numB;
                        return fullA.localeCompare(fullB);
                    }
                    return a.localeCompare(b);
                });

                extractedData = data;
                if (extractedData.length > 0) {
                    displayBox.innerText = `★~（๑≧▽≦๑）~★\n搞定！已提取 ${extractedData.length} 条数据`;
                    downloadBtn.style.display = "block";
                    // 自动复制到剪贴板
                    const textToCopy = extractedData.join('\n');
                    const tempInput = document.createElement("textarea");
                    document.body.appendChild(tempInput);
                    tempInput.value = textToCopy;
                    tempInput.select();
                    document.execCommand("copy");
                    document.body.removeChild(tempInput);
                } else {
                    displayBox.innerText = "(╯▔皿▔)╯ 没找到对应的编号啊！";
                    downloadBtn.style.display = "none";
                }
            }
        });
    });

    downloadBtn.addEventListener('click', () => {
        if (extractedData.length === 0) return;
        const now = new Date();
        const timeStamp = `${now.getMonth() + 1}${now.getDate()}${now.getMinutes().toString().padStart(2, '0')}`;
        const finalFileName = `${exportFileNameBase}${timeStamp}.txt`;

        const blob = new Blob([extractedData.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = finalFileName;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    });
});

// --- 核心算法部分（保持不变，确保尺码备注逻辑正常） ---
function extractScopedTitles(userPrefix, start, end) {
    const selector = "a.album3__main, a.album__main";
    const elements = document.querySelectorAll(selector);
    const titles = [];
    let cleanUserPrefix = userPrefix ? userPrefix.toUpperCase() : "";
    if (cleanUserPrefix.endsWith('D')) cleanUserPrefix = cleanUserPrefix.slice(0, -1);

    elements.forEach(el => {
        const rawTitle = (el.getAttribute('title') || "").trim();
        const codeMatch = rawTitle.match(/^([A-Za-z]+)(\d+)/);
        
        if (codeMatch) {
            let foundPrefix = codeMatch[1].toUpperCase();
            const foundNum = parseInt(codeMatch[2]);
            let comparePrefix = foundPrefix.endsWith('D') ? foundPrefix.slice(0, -1) : foundPrefix;
            
            let isMatch = true;
            if (cleanUserPrefix && comparePrefix !== cleanUserPrefix) isMatch = false;
            if (isMatch) {
                if (!isNaN(start) && foundNum < start) isMatch = false;
                if (!isNaN(end) && foundNum > end) isMatch = false;
            }

            if (isMatch) {
                let workingTitle = rawTitle.replace(/With original box/gi, "").trim();
                workingTitle = workingTitle.replace(/，/g, ","); 

                const tailRegex = /([\d,]+)\s*(?:只有)?\s*(\d{2}-\d{2})$/;
                const tailMatch = workingTitle.match(tailRegex);

                let finalTitle = workingTitle;
                if (tailMatch) {
                    const fullMatchText = tailMatch[0]; 
                    const note = tailMatch[1];          
                    const size = tailMatch[2];          
                    const formattedPart = `[${note}:${size}]`;
                    const lastIndex = workingTitle.lastIndexOf(fullMatchText);
                    finalTitle = workingTitle.substring(0, lastIndex) + formattedPart;
                }
                titles.push(finalTitle.replace(/\s+/g, " ").trim());
            }
        }
    });
    return titles;
}
