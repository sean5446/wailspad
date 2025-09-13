import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MantineProvider,
  AppShell,
  Group,
  Tabs,
  Menu,
  Button,
  Text,
  Modal,
  ActionIcon,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { Editor } from "@monaco-editor/react";

interface TabData {
  id: string;
  name: string;
  path?: string;
  content: string;
  unsaved?: boolean;
}

const STORAGE_KEY = "editorTabs";

export default function App() {
  const [tabs, setTabs] = useState<TabData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as TabData[];
      } catch {
        return [{ id: "1", name: "Untitled.txt", content: "" }];
      }
    }
    return [{ id: "1", name: "Untitled.txt", content: "" }];
  });

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "1");
  const currentTab = tabs.find((t) => t.id === activeTab);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tabToClose, setTabToClose] = useState<TabData | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(false);
  const [currentContent, setCurrentContent] = useState(currentTab?.content || "");
  const editorRef = useRef<any>(null);
  const [cursorPos, setCursorPos] = useState({ lineNumber: 1, column: 1 });
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition(() => {
      const pos = editor.getPosition();
      setCursorPos({ lineNumber: pos.lineNumber, column: pos.column });
    });
  };
  useEffect(() => {
    setCurrentContent(currentTab?.content || "");
  }, [currentTab]);

  const handleNewFile = useCallback(() => {
    const newTab: TabData = {
      id: Date.now().toString(),
      name: `Untitled-${tabs.length + 1}.txt`,
      content: "",
      unsaved: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(newTab.id);
  }, [tabs]);

  const handleOpenFileClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    const newTab: TabData = {
      id: Date.now().toString(),
      name: file.name,
      content,
      unsaved: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(newTab.id);
    e.target.value = "";
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!value || !currentTab) return;
    setCurrentContent(value);
    setTabs((prev) =>
      prev.map((t) =>
        t.id === currentTab.id ? { ...t, content: value, unsaved: true } : t
      )
    );
  };

  const handleCloseTab = (tab: TabData) => {
    if (tab.unsaved) {
      setTabToClose(tab);
      setShowConfirm(true);
    } else {
      setTabs((prev) => prev.filter((t) => t.id !== tab.id));
      if (activeTab === tab.id && tabs.length > 1) setActiveTab(tabs[0].id);
    }
  };

  const confirmClose = () => {
    if (!tabToClose) return;
    setTabs((prev) => prev.filter((t) => t.id !== tabToClose.id));
    if (activeTab === tabToClose.id && tabs.length > 1) setActiveTab(tabs[0].id);
    setTabToClose(null);
    setShowConfirm(false);
  };

  const handleSave = () => {
    if (!currentTab) return;
    const blob = new Blob([currentTab.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentTab.name;
    a.click();
    URL.revokeObjectURL(url);
    setTabs((prev) =>
      prev.map((t) =>
        t.id === currentTab.id ? { ...t, unsaved: false } : t
      )
    );
  };

  const clearCache = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTabs([{ id: "1", name: "Untitled.txt", content: "" }]);
    setActiveTab("1");
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault();
            handleSave();
            break;
          case "w":
            e.preventDefault();
            if (currentTab) handleCloseTab(currentTab);
            break;
          case "t":
          case "n":
            e.preventDefault();
            handleNewFile();
            break;
          case "+":
          case "=":
            e.preventDefault();
            setEditorFontSize((f) => Math.min(f + 1, 48));
            break;
          case "-":
            e.preventDefault();
            setEditorFontSize((f) => Math.max(f - 1, 8));
            break;
          case "0":
            e.preventDefault();
            setEditorFontSize(14);
            break;
        }
      }
      if (e.altKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setWordWrap((prev) => !prev);
      }
    },
    [handleNewFile, currentTab]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  }, [tabs]);

  return (
    <MantineProvider defaultColorScheme="dark">
      <AppShell style={{ height: "100vh" }}>
        {/* Manual header */}
        <Group
          style={{
            padding: "0 16px",
            height: 50,
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#1A1B1E",
          }}
        >
          <Group>
            <Menu>
              <Menu.Target>
                <Button variant="subtle" color="white">
                  File
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={handleNewFile}>New Tab</Menu.Item>
                <Menu.Item onClick={handleOpenFileClick}>Open</Menu.Item>
                <Menu.Item onClick={handleSave}>Save</Menu.Item>
                <Menu.Item
                  onClick={() => {
                    if (currentTab) handleCloseTab(currentTab);
                  }}
                  disabled={!currentTab} // optional, prevents clicking if no tab
                >
                  Close Tab
                </Menu.Item>
                <Menu.Item color="red" onClick={clearCache}>Clear Cache</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        <AppShell.Main
          style={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 50px)",
            minHeight: 0,
          }}
        >
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(val) => val && setActiveTab(val)}
            style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
          >
            <Tabs.List style={{ display: "flex", overflowX: "auto" }}>
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={tab.id === activeTab ? "filled" : "subtle"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 8px",
                  }}
                  onClick={() => setActiveTab(tab.id)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      handleCloseTab(tab);
                    }
                  }}
                >
                  <span>{tab.name}</span>
                  <ActionIcon
                    size="xs"
                    color="red"
                    style={{ marginLeft: 6 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tab);
                    }}
                  >
                    ×
                  </ActionIcon>
                </Button>
              ))}
            </Tabs.List>

            {/* Editor Panels */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {tabs.map((tab) => (
                <Tabs.Panel
                  key={tab.id}
                  value={tab.id}
                  style={{ flex: 1, minHeight: 0, position: "relative" }}
                >
                  <Editor
                    height="100%"
                    defaultLanguage="plaintext"
                    value={tab.content}
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    theme="vs-dark"
                    options={{
                      fontSize: editorFontSize,
                      minimap: { enabled: false },
                      lineNumbers: "on",
                      automaticLayout: true,
                      wordWrap: wordWrap ? "on" : "off",
                    }}
                  />
                </Tabs.Panel>
              ))}
            </div>
          </Tabs>

          {/* Status bar */}
          {currentTab && (
            <Group
              style={{
                height: 25,
                padding: "0 10px",
                borderTop: "1px solid #444",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#1A1B1E",
                color: "#EEE",
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              <Text>{`Ln ${cursorPos.lineNumber}, Col: ${cursorPos.column} | Chars: ${currentContent.length} | Font size: ${editorFontSize} | Wrap: ${wordWrap}`}</Text>
            </Group>
          )}

          <input
            type="file"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <Modal
            opened={showConfirm}
            onClose={() => setShowConfirm(false)}
            title="Unsaved Changes"
          >
            <Text>The file has unsaved changes. Close anyway?</Text>
            <Group style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button color="red" onClick={confirmClose}>
                Close
              </Button>
            </Group>
          </Modal>
        </AppShell.Main>
      </AppShell>
    </MantineProvider >
  );
}
