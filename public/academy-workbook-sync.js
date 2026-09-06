/* Account-owned workbook answers. No AI generation and no shared answer cache. */
;(function () {
  var userId = window.SSELFIE_WORKBOOK_USER
  if (!userId) return
  var productId = location.pathname.split("/").filter(Boolean).pop()
  if (["what_to_say", "show_up", "get_paid"].indexOf(productId) < 0) return
  var fields = Array.from(document.querySelectorAll('textarea,input[type="text"],select'))
  var attribute = { what_to_say: "data-wts-key", show_up: "data-su-key", get_paid: "data-gp-key" }[
    productId
  ]
  var oldKey = { what_to_say: "wts_answers", show_up: "showup_answers", get_paid: "gp_answers" }[
    productId
  ]
  var oldPrefix = { what_to_say: "field_", show_up: "su_field_", get_paid: "gp_field_" }[productId]
  var unkeyed = 0
  var questions = Array.from(document.querySelectorAll(".question-block")).filter(function (block) {
    return block.querySelector("textarea,input,select")
  })
  fields.forEach(function (field) {
    field.dataset.workbookLegacyKey = field.getAttribute(attribute) || oldPrefix + unkeyed++
    var block = field.closest(".question-block"),
      index = questions.indexOf(block)
    var position = block
      ? Array.from(block.querySelectorAll("textarea,input,select")).indexOf(field)
      : -1
    field.dataset.workbookKey =
      field.getAttribute(attribute) ||
      field.id ||
      (index >= 0 ? "q" + index + "f" + position : field.dataset.workbookLegacyKey)
    field.dataset.workbookLabel = label(field)
    if (block) block.dataset.workbookQuestionTitle = field.dataset.workbookLabel
  })
  var cacheKey = "sselfie-workbook:" + userId + ":" + productId
  var revision = 0,
    ready = false,
    dirty = false,
    saving = null,
    timer = null,
    extras = [],
    blocked = false
  var status = document.createElement("div")
  status.setAttribute("role", "status")
  status.setAttribute("aria-live", "polite")
  status.style.cssText =
    "position:sticky;top:0;z-index:1000;padding:12px 20px;background:#f4f0e6;color:#0f0d0b;font:14px/1.5 sans-serif;border-bottom:1px solid #c4b5a0"
  function message(text, retry) {
    status.textContent = text
    if (retry) {
      var button = document.createElement("button")
      button.type = "button"
      button.textContent = "Try again"
      button.style.marginLeft = "12px"
      button.onclick = retry
      status.appendChild(button)
    }
  }
  function label(field) {
    if (field.dataset.workbookLabel) return field.dataset.workbookLabel
    var block =
      field.closest(
        ".question-block,.positioning-row,.offer-row,.offer-build-row,.sales-section,.ask-block,.week-row"
      ) || field.parentElement
    var node =
      block &&
      block.querySelector(
        ".question-label,.fill-label,label,.sales-section-label,.ask-block-label,.week-label"
      )
    var title = node ? node.textContent.trim() : "Workbook answer"
    if (title.toLowerCase() === "your turn") {
      var pillar = field.closest(".pillar"),
        heading = pillar && pillar.querySelector("h3")
      title = heading ? heading.textContent.trim() : field.placeholder || title
    }
    return title.slice(0, 300)
  }
  function answers() {
    return fields
      .map(function (field) {
        return { key: field.dataset.workbookKey, label: label(field), value: field.value }
      })
      .concat(extras)
  }
  function localRead(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null")
    } catch (_) {
      return null
    }
  }
  function cache() {
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ revision: revision, answers: answers(), dirty: dirty })
      )
    } catch (_) {}
  }
  function apply(saved) {
    fields.forEach(function (field) {
      field.value = ""
    })
    extras = []
    ;(saved || []).forEach(function (answer) {
      var target = fields.find(function (field) {
        return field.dataset.workbookKey === answer.key
      })
      if (!target && /^legacy_/.test(answer.key)) {
        var matches = fields.filter(function (field) {
          return label(field) === answer.label
        })
        if (matches.length === 1) target = matches[0]
      }
      if (target) target.value = answer.value
      else extras.push(answer) // Preserve older answers whose questions have moved.
    })
    var previous = document.querySelector(".sw-workbook-older")
    if (previous) previous.remove()
    if (extras.length) {
      var panel = document.createElement("details")
      panel.className = "sw-workbook-older"
      panel.style.cssText = "padding:12px 20px;background:#f4f0e6"
      var summary = document.createElement("summary")
      summary.textContent = "Earlier saved answers. Review, edit or clear them here."
      panel.appendChild(summary)
      extras.forEach(function (answer) {
        var label = document.createElement("label")
        label.textContent = answer.label
        label.style.display = "block"
        var input = document.createElement("textarea")
        input.value = answer.value
        input.style.cssText = "display:block;width:100%;min-height:70px"
        input.addEventListener("input", function () {
          answer.value = input.value
          schedule()
        })
        label.appendChild(input)
        panel.appendChild(label)
      })
      status.insertAdjacentElement("afterend", panel)
    }
    window.dispatchEvent(new Event("sselfie-workbook-loaded"))
  }
  function setDisabled(disabled) {
    fields.forEach(function (field) {
      field.disabled = disabled
    })
  }
  async function flush() {
    clearTimeout(timer)
    if (!ready || blocked)
      throw new Error(
        "Your answers have not reached Maya. Reopen the workbook to check your account and saved answers."
      )
    if (saving) {
      await saving
      if (dirty) return flush()
      return
    }
    if (!dirty) return
    dirty = false
    var sent = answers()
    message("Saving your answers for Maya…")
    saving = (async function () {
      try {
        var response = await fetch("/api/academy/workbook-answers", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userId,
            productId: productId,
            revision: revision,
            answers: sent,
          }),
        })
        var result = await response.json()
        if (!response.ok) {
          if (response.status === 409) blocked = true
          throw new Error(result.error || "Your answers have not reached Maya. Please try again.")
        }
        revision = result.revision
        cache()
        message(
          dirty
            ? "Saving your latest edits…"
            : "Saved to your account. Maya can use these answers in your next message."
        )
      } catch (error) {
        dirty = true
        cache()
        message(
          error.message,
          blocked
            ? null
            : function () {
                flush().catch(function () {})
              }
        )
        throw error
      } finally {
        saving = null
      }
    })()
    await saving
    if (dirty) return flush()
  }
  function schedule() {
    if (!ready) return
    dirty = true
    cache()
    clearTimeout(timer)
    message("Your latest edit has not reached Maya yet.")
    timer = setTimeout(function () {
      flush().catch(function () {})
    }, 700)
  }
  window.SSELFIE_WORKBOOK_SYNC = {
    flush: flush,
    schedule: schedule,
    getAnswers: answers,
    isReady: function () {
      return ready && !blocked
    },
  }
  fields.forEach(function (field) {
    field.addEventListener("input", schedule)
    field.addEventListener("change", schedule)
  })
  window.addEventListener("beforeunload", function (event) {
    if (dirty || saving) {
      event.preventDefault()
      event.returnValue = ""
    }
  })
  function offerRestore(text, restore) {
    var panel = document.createElement("details")
    panel.style.cssText = "padding:12px 20px;background:#f4f0e6"
    var summary = document.createElement("summary")
    summary.textContent = text
    panel.appendChild(summary)
    var preview = document.createElement("pre")
    preview.style.cssText = "white-space:pre-wrap;max-height:240px;overflow:auto"
    var button = document.createElement("button")
    button.type = "button"
    button.textContent = "These answers are mine. Restore this draft."
    button.onclick = function () {
      if (
        !window.confirm(
          "Replace the answers shown here with this browser draft? Only continue if these answers are yours."
        )
      )
        return
      restore(true)
      panel.remove()
      schedule()
    }
    // Show the actual draft before the member chooses whether it belongs to her.
    preview.textContent = restore(false)
    panel.appendChild(preview)
    panel.appendChild(button)
    status.insertAdjacentElement("afterend", panel)
  }
  async function load() {
    ready = false
    setDisabled(true)
    message("Loading your saved workbook answers…")
    try {
      var response = await fetch("/api/academy/workbook-answers?productId=" + productId, {
        credentials: "include",
        cache: "no-store",
      })
      var data = await response.json()
      if (!response.ok) throw new Error(data.error || "Your answers could not be loaded.")
      if (data.userId !== userId)
        throw new Error("Your signed-in account changed. Reopen this workbook.")
      revision = data.workbook.revision
      apply(data.workbook.answers)
      var pending = localRead(cacheKey)
      ready = true
      setDisabled(false)
      message(
        data.workbook.source === "empty"
          ? "Your answers will save to your account and be available to Maya."
          : "Your saved answers are loaded. Maya can use them in your next message."
      )
      if (pending && pending.dirty && Array.isArray(pending.answers)) {
        offerRestore("Review my unsaved browser draft", function (restore) {
          if (restore) apply(pending.answers)
          return pending.answers
            .map(function (answer) {
              return answer.label + ": " + answer.value
            })
            .join("\n\n")
        })
      }
      var legacy = localRead("sselfie-workbook-wizard:" + productId + ":v1"),
        old = localRead(oldKey)
      if (
        (legacy && legacy.values && Object.values(legacy.values).some(Boolean)) ||
        (old && Object.values(old).some(Boolean))
      ) {
        offerRestore("Review an older draft on this browser", function (restore) {
          if (!restore)
            return JSON.stringify(
              { workbook: old, guidedWorkbook: legacy && legacy.values },
              null,
              2
            )
          fields.forEach(function (field) {
            var value = old && old[field.dataset.workbookLegacyKey]
            if (typeof value === "string") field.value = value
          })
          questions.forEach(function (block, i) {
            block.querySelectorAll("textarea,input,select").forEach(function (field, j) {
              var key = field.getAttribute(attribute) || field.id || "q" + i + "f" + j
              var value = legacy && legacy.values && legacy.values[key]
              if (typeof value === "string") field.value = value
            })
          })
        })
      }
    } catch (error) {
      message(error.message + " Your existing answers have not been changed.", load)
    }
  }
  setDisabled(true)
  window.addEventListener("DOMContentLoaded", function () {
    var mount = document.querySelector(".sw-shell") || document.body
    mount.insertBefore(status, mount.querySelector(".sw-stage") || mount.firstChild)
    load()
  })
})()
