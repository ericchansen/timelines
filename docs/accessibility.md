# Accessibility

Interactive event renderers use roving focus. Orientation-aware arrow keys move along time, Home and End move to the boundaries, Enter or Space pins, and Escape clears. Hover and focus preview without mutating the pinned selection.

The overview/detail renderer exposes the viewport and both resize handles as separate keyboard-focusable controls. Pointer and touch dragging use pointer capture.

The semantic feed remains a native ordered reading pattern. It deliberately avoids listbox semantics and synthetic arrow-key behavior.

Each catalog example generates its Keyboard disclosure from that page's actual command set. Escape closes the disclosure and restores focus to its trigger.
