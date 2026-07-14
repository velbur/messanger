/**
 * Вкладка «Студия»: одиночные фото + анимация.
 * Зависимости передаются из app.js (модели, lightbox, clipboard).
 */

const setStatus = (el, text, isError = false) => {
  if (!el) {
    return;
  }
  el.textContent = text || "";
  el.classList.toggle("status-text--error", Boolean(isError && text));
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });

export const initStudioTab = ({
  getStoryImageModel,
  getStoryVideoModel,
  populateImageModels,
  populateVideoModels,
  pickClipboardImageFile,
  openImageLightbox,
  openVideoLightbox,
}) => {
  const tabPanelStudio = document.getElementById("tabPanelStudio");
  const studioListView = document.getElementById("studioListView");
  const studioClipsList = document.getElementById("studioClipsList");
  const studioClipsCount = document.getElementById("studioClipsCount");
  const studioBrowseHint = document.getElementById("studioBrowseHint");
  const studioBrowseTitle = document.getElementById("studioBrowseTitle");
  const btnStudioShowList = document.getElementById("btnStudioShowList");
  const studioEditor = document.getElementById("studioEditor");
  const studioEditorTitle = document.getElementById("studioEditorTitle");
  const studioTitleInput = document.getElementById("studioTitleInput");
  const studioAspectSelect = document.getElementById("studioAspectSelect");
  const studioVideoDurationSelect = document.getElementById("studioVideoDurationSelect");
  const studioImageModelSelect = document.getElementById("studioImageModelSelect");
  const studioVideoModelSelect = document.getElementById("studioVideoModelSelect");
  const studioPromptInput = document.getElementById("studioPromptInput");
  const studioMotionPromptInput = document.getElementById("studioMotionPromptInput");
  const studioEditPromptInput = document.getElementById("studioEditPromptInput");
  const studioImagePreview = document.getElementById("studioImagePreview");
  const studioVideoPreview = document.getElementById("studioVideoPreview");
  const studioImageCard = document.getElementById("studioImageCard");
  const studioStatus = document.getElementById("studioStatus");
  const btnRefreshStudioList = document.getElementById("btnRefreshStudioList");
  const btnNewStudioClip = document.getElementById("btnNewStudioClip");
  const btnStudioBack = document.getElementById("btnStudioBack");
  const btnStudioDeleteClip = document.getElementById("btnStudioDeleteClip");
  const btnStudioSave = document.getElementById("btnStudioSave");
  const btnStudioPaste = document.getElementById("btnStudioPaste");
  const btnStudioGenerateImage = document.getElementById("btnStudioGenerateImage");
  const btnStudioCorrect = document.getElementById("btnStudioCorrect");
  const btnStudioGenerateVideo = document.getElementById("btnStudioGenerateVideo");
  const btnStudioDeleteImage = document.getElementById("btnStudioDeleteImage");
  const btnStudioDeleteVideo = document.getElementById("btnStudioDeleteVideo");

  let clips = [];
  let activeId = null;
  let saveTimer = null;
  let busy = false;

  const goToList = async ({refresh = true} = {}) => {
    if (activeId) {
      try {
        await saveClip({silent: true});
      } catch {
        /* keep going to list */
      }
    }
    activeId = null;
    if (studioEditor) {
      studioEditor.hidden = true;
    }
    if (studioListView) {
      studioListView.hidden = false;
    }
    if (studioBrowseHint) {
      studioBrowseHint.hidden = false;
    }
    if (studioBrowseTitle) {
      studioBrowseTitle.textContent = "Студия";
    }
    if (btnStudioShowList) {
      btnStudioShowList.hidden = true;
    }
    if (refresh) {
      try {
        await refreshList();
      } catch (error) {
        setStatus(studioStatus, error instanceof Error ? error.message : String(error), true);
        renderList();
      }
    } else {
      renderList();
    }
    setStatus(studioStatus, "");
  };

  const showEditor = () => {
    if (studioListView) {
      studioListView.hidden = true;
    }
    if (studioEditor) {
      studioEditor.hidden = false;
    }
    if (studioBrowseHint) {
      studioBrowseHint.hidden = true;
    }
    if (studioBrowseTitle) {
      studioBrowseTitle.textContent = "Редактор кадра";
    }
    if (btnStudioShowList) {
      btnStudioShowList.hidden = false;
    }
  };

  const renderPreview = (clip) => {
    if (!studioImagePreview || !studioVideoPreview) {
      return;
    }
    studioImagePreview.replaceChildren();
    studioVideoPreview.replaceChildren();

    if (clip?.imagePreviewUrl || clip?.image) {
      const img = document.createElement("img");
      img.src = clip.imagePreviewUrl || `/${String(clip.image).replace(/^\/+/, "")}`;
      img.alt = clip.title || "Кадр";
      img.className = "studio-preview-card__img";
      img.addEventListener("click", () => openImageLightbox?.(img.src));
      studioImagePreview.append(img);
    } else {
      const empty = document.createElement("span");
      empty.className = "studio-preview-card__empty";
      empty.textContent = "Нет фото — сгенерируйте или вставьте из буфера";
      studioImagePreview.append(empty);
    }

    if (clip?.videoPreviewUrl || clip?.video) {
      const video = document.createElement("video");
      video.src = clip.videoPreviewUrl || `/${String(clip.video).replace(/^\/+/, "")}`;
      video.controls = true;
      video.playsInline = true;
      video.muted = true;
      video.className = "studio-preview-card__video";
      video.addEventListener("dblclick", () => openVideoLightbox?.(video.src));
      studioVideoPreview.append(video);
      if (clip.videoDurationMs) {
        const meta = document.createElement("span");
        meta.className = "studio-preview-card__meta";
        meta.textContent = `${(clip.videoDurationMs / 1000).toFixed(1)} с`;
        studioVideoPreview.append(meta);
      }
    } else {
      const empty = document.createElement("span");
      empty.className = "studio-preview-card__empty";
      empty.textContent = "Нет анимации";
      studioVideoPreview.append(empty);
    }
  };

  const fillEditor = (clip) => {
    if (!clip) {
      return;
    }
    if (studioEditorTitle) {
      studioEditorTitle.textContent = clip.title || "Кадр";
    }
    if (studioTitleInput) {
      studioTitleInput.value = clip.title || "";
    }
    if (studioAspectSelect) {
      studioAspectSelect.value = clip.aspectRatio || "9:16";
    }
    if (studioVideoDurationSelect) {
      studioVideoDurationSelect.value = String(clip.videoDurationSec || 4);
    }
    if (studioPromptInput) {
      studioPromptInput.value = clip.prompt || "";
    }
    if (studioMotionPromptInput) {
      studioMotionPromptInput.value = clip.motionPrompt || "";
    }
    if (studioEditPromptInput) {
      studioEditPromptInput.value = clip.editPrompt || "";
    }
    renderPreview(clip);
  };

  const renderList = () => {
    if (!studioClipsList) {
      return;
    }
    studioClipsList.replaceChildren();
    if (studioClipsCount) {
      studioClipsCount.textContent =
        clips.length === 0 ? "пусто" : `${clips.length} ${clips.length === 1 ? "кадр" : "кадров"}`;
    }
    if (clips.length === 0) {
      const empty = document.createElement("p");
      empty.className = "dialogue-hint";
      empty.textContent = "Пока нет сохранённых кадров. Нажмите «Новый кадр».";
      studioClipsList.append(empty);
      return;
    }

    for (const clip of clips) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "studio-clip-card";
      const thumb = document.createElement("div");
      thumb.className = "studio-clip-card__thumb";
      if (clip.imagePreviewUrl || clip.image) {
        const img = document.createElement("img");
        img.src = clip.imagePreviewUrl || `/${String(clip.image).replace(/^\/+/, "")}`;
        img.alt = "";
        thumb.append(img);
      } else {
        thumb.textContent = "нет фото";
      }
      if (clip.video) {
        const badge = document.createElement("span");
        badge.className = "studio-clip-card__badge";
        badge.textContent = "видео";
        thumb.append(badge);
      }
      const body = document.createElement("div");
      body.className = "studio-clip-card__body";
      const title = document.createElement("strong");
      title.textContent = clip.title || "Без названия";
      const meta = document.createElement("span");
      const flags = [
        clip.aspectRatio || "9:16",
        clip.videoDurationSec ? `${clip.videoDurationSec}с` : null,
        clip.image ? "фото" : "без фото",
        clip.video ? "анимация" : null,
      ].filter(Boolean);
      meta.textContent = flags.join(" · ");
      body.append(title, meta);
      card.append(thumb, body);
      card.addEventListener("click", () => void openClip(clip.id));
      studioClipsList.append(card);
    }
  };

  const refreshList = async () => {
    const res = await fetch("/api/studio");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    clips = Array.isArray(data.clips) ? data.clips : [];
    renderList();
    if (activeId) {
      const clip = clips.find((c) => c.id === activeId);
      if (clip) {
        fillEditor(clip);
      } else {
        activeId = null;
        if (studioEditor) {
          studioEditor.hidden = true;
        }
        if (studioListView) {
          studioListView.hidden = false;
        }
        if (btnStudioShowList) {
          btnStudioShowList.hidden = true;
        }
      }
    }
  };

  const openClip = async (id) => {
    const res = await fetch(`/api/studio/${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(studioStatus, data.error || "Не удалось открыть", true);
      return;
    }
    const clip = data.clip;
    const idx = clips.findIndex((c) => c.id === clip.id);
    if (idx >= 0) {
      clips[idx] = clip;
    } else {
      clips.unshift(clip);
    }
    activeId = clip.id;
    fillEditor(clip);
    showEditor();
    populateImageModels?.(studioImageModelSelect);
    populateVideoModels?.(studioVideoModelSelect);
  };

  const collectPatch = () => ({
    title: studioTitleInput?.value ?? "",
    prompt: studioPromptInput?.value ?? "",
    motionPrompt: studioMotionPromptInput?.value ?? "",
    editPrompt: studioEditPromptInput?.value ?? "",
    aspectRatio: studioAspectSelect?.value ?? "9:16",
    videoDurationSec: Number(studioVideoDurationSelect?.value || 4),
  });

  const saveClip = async ({silent = false} = {}) => {
    if (!activeId) {
      return null;
    }
    const res = await fetch(`/api/studio/${encodeURIComponent(activeId)}`, {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(collectPatch()),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (!silent) {
        setStatus(studioStatus, data.error || "Ошибка сохранения", true);
      }
      throw new Error(data.error || "Ошибка сохранения");
    }
    const clip = data.clip;
    const idx = clips.findIndex((c) => c.id === clip.id);
    if (idx >= 0) {
      clips[idx] = clip;
    }
    if (!silent) {
      setStatus(studioStatus, "Сохранено");
    }
    return clip;
  };

  const scheduleSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
      void saveClip({silent: true}).catch(() => {});
    }, 700);
  };

  const withBusy = async (label, fn) => {
    if (busy) {
      return;
    }
    busy = true;
    setStatus(studioStatus, label);
    try {
      await fn();
    } catch (error) {
      setStatus(studioStatus, error instanceof Error ? error.message : String(error), true);
    } finally {
      busy = false;
    }
  };

  const applyClipResult = (clip) => {
    if (!clip) {
      return;
    }
    const idx = clips.findIndex((c) => c.id === clip.id);
    if (idx >= 0) {
      clips[idx] = clip;
    } else {
      clips.unshift(clip);
    }
    activeId = clip.id;
    fillEditor(clip);
  };

  btnRefreshStudioList?.addEventListener("click", () => {
    void withBusy("Обновление…", async () => {
      await refreshList();
      setStatus(studioStatus, "Список обновлён");
    });
  });

  btnStudioShowList?.addEventListener("click", () => {
    void goToList();
  });

  btnNewStudioClip?.addEventListener("click", () => {
    void withBusy("Создание…", async () => {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title: "Новый кадр", aspectRatio: "9:16", videoDurationSec: 4}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      clips.unshift(data.clip);
      activeId = data.clip.id;
      fillEditor(data.clip);
      showEditor();
      populateImageModels?.(studioImageModelSelect);
      populateVideoModels?.(studioVideoModelSelect);
      setStatus(studioStatus, "Новый кадр создан — заполните промпт");
    });
  });

  btnStudioBack?.addEventListener("click", () => {
    void goToList();
  });

  btnStudioDeleteClip?.addEventListener("click", () => {
    if (!activeId || !confirm("Удалить этот кадр и все файлы?")) {
      return;
    }
    void withBusy("Удаление…", async () => {
      const res = await fetch(`/api/studio/${encodeURIComponent(activeId)}`, {method: "DELETE"});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      clips = clips.filter((c) => c.id !== activeId);
      activeId = null;
      await goToList({refresh: false});
      setStatus(studioStatus, "Кадр удалён");
    });
  });

  btnStudioSave?.addEventListener("click", () => {
    void withBusy("Сохранение…", async () => {
      await saveClip();
    });
  });

  for (const el of [
    studioTitleInput,
    studioPromptInput,
    studioMotionPromptInput,
    studioEditPromptInput,
    studioAspectSelect,
    studioVideoDurationSelect,
  ]) {
    el?.addEventListener("input", scheduleSave);
    el?.addEventListener("change", scheduleSave);
  }

  const pasteImage = async (clipboardData) => {
    if (!activeId) {
      throw new Error("Сначала откройте или создайте кадр");
    }
    await saveClip({silent: true});
    const file = await pickClipboardImageFile(clipboardData);
    if (!file) {
      throw new Error("В буфере нет изображения");
    }
    const contentBase64 = await fileToDataUrl(file);
    const res = await fetch(`/api/studio/${encodeURIComponent(activeId)}/upload`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({contentBase64, fileName: file.name}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    applyClipResult(data.clip);
    setStatus(studioStatus, "Фото вставлено из буфера");
  };

  btnStudioPaste?.addEventListener("click", () => {
    void withBusy("Вставка из буфера…", () => pasteImage(null));
  });

  studioImageCard?.addEventListener("paste", (e) => {
    e.preventDefault();
    void withBusy("Вставка из буфера…", () => pasteImage(e.clipboardData));
  });

  btnStudioGenerateImage?.addEventListener("click", () => {
    void withBusy("Генерация фото…", async () => {
      await saveClip({silent: true});
      const res = await fetch(`/api/studio/${encodeURIComponent(activeId)}/generate-image`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          storyImageModel: studioImageModelSelect?.value || getStoryImageModel?.(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      applyClipResult(data.clip);
      setStatus(studioStatus, (data.logs || []).join(" · ") || "Фото готово");
    });
  });

  btnStudioCorrect?.addEventListener("click", () => {
    void withBusy("Правка кадра…", async () => {
      await saveClip({silent: true});
      const res = await fetch(`/api/studio/${encodeURIComponent(activeId)}/correct`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          editPrompt: studioEditPromptInput?.value ?? "",
          storyImageModel: studioImageModelSelect?.value || getStoryImageModel?.(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      applyClipResult(data.clip);
      setStatus(studioStatus, (data.logs || []).join(" · ") || "Правка применена");
    });
  });

  btnStudioGenerateVideo?.addEventListener("click", () => {
    void withBusy("Анимация…", async () => {
      await saveClip({silent: true});
      const res = await fetch(`/api/studio/${encodeURIComponent(activeId)}/generate-video`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          storyVideoModel: studioVideoModelSelect?.value || getStoryVideoModel?.(),
          videoDurationSec: Number(studioVideoDurationSelect?.value || 4),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      applyClipResult(data.clip);
      setStatus(studioStatus, (data.logs || []).join(" · ") || "Анимация готова");
    });
  });

  btnStudioDeleteImage?.addEventListener("click", () => {
    if (!activeId || !confirm("Удалить фото и анимацию этого кадра?")) {
      return;
    }
    void withBusy("Удаление фото…", async () => {
      const res = await fetch(`/api/studio/${encodeURIComponent(activeId)}/delete-image`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      applyClipResult(data.clip);
      setStatus(studioStatus, "Фото удалено");
    });
  });

  btnStudioDeleteVideo?.addEventListener("click", () => {
    if (!activeId || !confirm("Удалить только анимацию?")) {
      return;
    }
    void withBusy("Удаление анимации…", async () => {
      const res = await fetch(`/api/studio/${encodeURIComponent(activeId)}/delete-video`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      applyClipResult(data.clip);
      setStatus(studioStatus, "Анимация удалена");
    });
  });

  return {
    tabPanelStudio,
    onActivate: async () => {
      populateImageModels?.(studioImageModelSelect);
      populateVideoModels?.(studioVideoModelSelect);
      try {
        // При открытии вкладки всегда показываем список сохранённых кадров
        await goToList({refresh: true});
      } catch (error) {
        setStatus(studioStatus, error instanceof Error ? error.message : String(error), true);
      }
    },
    updateVisibility: (activeMainTab) => {
      if (!tabPanelStudio) {
        return;
      }
      const active = activeMainTab === "studio";
      tabPanelStudio.hidden = !active;
      tabPanelStudio.classList.toggle("tab-panel--active", active);
    },
  };
};
