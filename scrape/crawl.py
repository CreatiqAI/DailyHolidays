import urllib.request, re, time, hashlib, json, html, sys
from urllib.parse import urljoin, urlparse
BASE="http://www.dailyholidays.com.my/"
seen=set(); queue=[BASE+"index.php"]; out={}
UA={"User-Agent":"Mozilla/5.0"}
def norm(u):
    u=html.unescape(u).split('#')[0]
    return u
while queue and len(seen)<400:
    u=queue.pop(0)
    if u in seen: continue
    seen.add(u)
    try:
        raw=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30).read()
    except Exception as e:
        print("ERR",u,e); continue
    try: txt=raw.decode('utf-8')
    except: txt=raw.decode('gb2312','replace')
    fn="pages/"+hashlib.md5(u.encode()).hexdigest()[:10]+".html"
    open(fn,"w",encoding="utf-8").write(txt)
    t=re.search(r'<title>(.*?)</title>',txt,re.S)
    out[u]={"file":fn,"title":t.group(1).strip() if t else ""}
    print(len(seen),u)
    for h in re.findall(r'href=["\']([^"\']+)["\']',txt):
        h=norm(urljoin(u,h))
        p=urlparse(h)
        if p.netloc in("www.dailyholidays.com.my","dailyholidays.com.my") and "index.php" in p.path and "lang=" not in h and "javascript" not in h:
            h=h.replace("://dailyholidays","://www.dailyholidays")
            if h not in seen and h not in queue: queue.append(h)
    time.sleep(0.7)
json.dump(out,open("urls.json","w"),indent=1)
