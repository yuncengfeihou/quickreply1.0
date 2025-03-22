import { extension_settings } from "../../../extensions.js";

// 插件名称常量
const EXTENSION_NAME = "quick-reply-menu";

// 存储快捷回复数据
let chatQuickReplies = [];
let globalQuickReplies = [];
let menuVisible = false;

/**
 * 初始化快速回复菜单
 */
function initQuickReplyMenu() {
    // 创建快速回复按钮
    const quickReplyButton = document.createElement('div');
    quickReplyButton.id = 'quick-reply-menu-button';
    quickReplyButton.innerText = '[快速回复]';
    document.body.appendChild(quickReplyButton);

    // 创建快速回复菜单
    const quickReplyMenu = document.createElement('div');
    quickReplyMenu.id = 'quick-reply-menu';
    quickReplyMenu.innerHTML = `
        <div class="quick-reply-menu-container">
            <div class="quick-reply-list" id="chat-quick-replies">
                <div class="quick-reply-list-title">聊天快捷回复</div>
                <div id="chat-qr-items"></div>
            </div>
            <div class="quick-reply-list" id="global-quick-replies">
                <div class="quick-reply-list-title">全局快捷回复</div>
                <div id="global-qr-items"></div>
            </div>
        </div>
    `;
    document.body.appendChild(quickReplyMenu);

    // 绑定按钮点击事件
    quickReplyButton.addEventListener('click', toggleQuickReplyMenu);

    // 点击菜单外部区域关闭菜单
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('quick-reply-menu');
        const button = document.getElementById('quick-reply-menu-button');
        
        if (menuVisible && 
            event.target !== menu && 
            !menu.contains(event.target) && 
            event.target !== button) {
            hideQuickReplyMenu();
        }
    });
}

/**
 * 切换快速回复菜单显示/隐藏
 */
function toggleQuickReplyMenu() {
    const menu = document.getElementById('quick-reply-menu');
    
    if (menuVisible) {
        hideQuickReplyMenu();
    } else {
        // 显示前更新可用的快捷回复列表
        updateQuickReplies();
        menu.style.display = 'block';
        menuVisible = true;
    }
}

/**
 * 隐藏快速回复菜单
 */
function hideQuickReplyMenu() {
    const menu = document.getElementById('quick-reply-menu');
    menu.style.display = 'none';
    menuVisible = false;
}

/**
 * 获取并更新当前可用的快捷回复
 */
function updateQuickReplies() {
    if (!window.quickReplyApi) {
        console.error('Quick Reply API not found!');
        return;
    }

    const qrApi = window.quickReplyApi;
    
    // 清空现有数据
    chatQuickReplies = [];
    globalQuickReplies = [];
    
    // 获取聊天级别的快捷回复
    try {
        const chatSets = qrApi.listChatSets();
        const chatQrLabels = new Set(); // 用于跟踪已添加的标签，避免重复
        
        chatSets.forEach(setName => {
            const qrSet = qrApi.getSetByName(setName);
            if (qrSet && qrSet.qrList) {
                qrSet.qrList.forEach(qr => {
                    if (!qr.isHidden) {
                        chatQuickReplies.push({
                            setName: setName,
                            label: qr.label,
                            message: qr.message
                        });
                        chatQrLabels.add(qr.label);
                    }
                });
            }
        });
        
        // 获取全局快捷回复（排除已经在聊天级别存在的）
        const globalSets = qrApi.listGlobalSets();
        globalSets.forEach(setName => {
            const qrSet = qrApi.getSetByName(setName);
            if (qrSet && qrSet.qrList) {
                qrSet.qrList.forEach(qr => {
                    // 只添加不在聊天级别中且未隐藏的快捷回复
                    if (!qr.isHidden && !chatQrLabels.has(qr.label)) {
                        globalQuickReplies.push({
                            setName: setName,
                            label: qr.label,
                            message: qr.message
                        });
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error fetching quick replies:', error);
    }
    
    // 更新界面显示
    renderQuickReplies();
}

/**
 * 渲染快捷回复到菜单
 */
function renderQuickReplies() {
    const chatContainer = document.getElementById('chat-qr-items');
    const globalContainer = document.getElementById('global-qr-items');
    
    // 清空现有内容
    chatContainer.innerHTML = '';
    globalContainer.innerHTML = '';
    
    // 渲染聊天快捷回复
    if (chatQuickReplies.length > 0) {
        // 限制显示最多10个
        const displayItems = chatQuickReplies.slice(0, 10);
        displayItems.forEach(qr => {
            const item = document.createElement('div');
            item.className = 'quick-reply-item';
            item.innerText = qr.label;
            item.title = qr.message.substring(0, 50) + (qr.message.length > 50 ? '...' : '');
            item.addEventListener('click', () => {
                triggerQuickReply(qr.setName, qr.label);
            });
            chatContainer.appendChild(item);
        });
    } else {
        chatContainer.innerHTML = '<div class="quick-reply-empty">没有可用的聊天快捷回复</div>';
    }
    
    // 渲染全局快捷回复
    if (globalQuickReplies.length > 0) {
        // 限制显示最多10个
        const displayItems = globalQuickReplies.slice(0, 10);
        displayItems.forEach(qr => {
            const item = document.createElement('div');
            item.className = 'quick-reply-item';
            item.innerText = qr.label;
            item.title = qr.message.substring(0, 50) + (qr.message.length > 50 ? '...' : '');
            item.addEventListener('click', () => {
                triggerQuickReply(qr.setName, qr.label);
            });
            globalContainer.appendChild(item);
        });
    } else {
        globalContainer.innerHTML = '<div class="quick-reply-empty">没有可用的全局快捷回复</div>';
    }
}

/**
 * 触发指定的快捷回复
 * @param {string} setName Quick Reply Set 名称
 * @param {string} label Quick Reply 标签
 */
function triggerQuickReply(setName, label) {
    if (!window.quickReplyApi) {
        console.error('Quick Reply API not found!');
        return;
    }
    
    try {
        // 使用 QuickReplyApi.executeQuickReply 方法触发快捷回复
        window.quickReplyApi.executeQuickReply(setName, label)
            .then(result => {
                console.log(`Quick Reply "${setName}.${label}" 执行成功:`, result);
                // 成功触发后关闭菜单
                hideQuickReplyMenu();
            })
            .catch(error => {
                console.error(`触发 Quick Reply "${setName}.${label}" 失败:`, error);
                // 即使失败也关闭菜单
                hideQuickReplyMenu();
            });
    } catch (error) {
        console.error('Error triggering quick reply:', error);
        hideQuickReplyMenu();
    }
}

/**
 * 插件加载入口
 */
jQuery(async () => {
    // 初始化插件设置
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};
    
    // 添加设置项到扩展设置页面
    const settingsHtml = `
    <div id="${EXTENSION_NAME}-settings" class="extension-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>快速回复增强菜单</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
            </div>
            <div class="inline-drawer-content">
                <p>此插件隐藏了原有的快捷回复栏，并创建了一个新的快速回复菜单。</p>
                <p>点击屏幕中央顶部的"[快速回复]"按钮可以打开菜单。</p>
                <div class="flex-container flexGap5">
                    <label>插件状态:</label>
                    <select id="${EXTENSION_NAME}-enabled" class="text_pole">
                        <option value="true" selected>启用</option>
                        <option value="false">禁用</option>
                    </select>
                </div>
                <hr class="sysHR">
            </div>
        </div>
    </div>`;
    
    $('#extensions_settings').append(settingsHtml);
    
    // 初始化UI组件
    initQuickReplyMenu();
    
    // 监听设置变更
    $(`#${EXTENSION_NAME}-enabled`).on('change', function() {
        const isEnabled = $(this).val() === 'true';
        extension_settings[EXTENSION_NAME].enabled = isEnabled;
        
        if (isEnabled) {
            $('#quick-reply-menu-button').show();
        } else {
            $('#quick-reply-menu-button').hide();
            hideQuickReplyMenu();
        }
    });
    
    // 检查插件是否已启用
    if (extension_settings[EXTENSION_NAME].enabled !== false) {
        extension_settings[EXTENSION_NAME].enabled = true;
        $(`#${EXTENSION_NAME}-enabled`).val('true');
    } else {
        $('#quick-reply-menu-button').hide();
        $(`#${EXTENSION_NAME}-enabled`).val('false');
    }
});
