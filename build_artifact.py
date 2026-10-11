css = open('dist-artifact/app.css', encoding='utf8').read()
js = open('dist-artifact/app.js', encoding='utf8').read().replace('</script', '<\\/script')
html = ('<title>Winner Apparels</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">\n'
        '<style>html,body{height:100%}body{font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:16px}#root{height:100%}\n' + css + '</style>\n'
        '<div id="root"></div>\n<script>' + js + '</script>\n')
open('winner-apparels.html', 'w', encoding='utf8').write(html)
print(len(html))
