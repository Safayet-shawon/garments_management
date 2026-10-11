try {
  var t = localStorage.getItem('wa-theme')
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
    document.documentElement.style.background = '#0a1024'
  }
  var b = localStorage.getItem('wa-btn')
  if (b) document.documentElement.setAttribute('data-btn', b)
} catch (e) { /* storage blocked */ }
