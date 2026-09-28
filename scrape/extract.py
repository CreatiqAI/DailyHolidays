import json,re,html,csv
from html.parser import HTMLParser
d=json.load(open("urls.json"))
def text(s):
    s=re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>','',s)
    s=re.sub(r'(?i)<br\s*/?>|</p>|</li>|</h\d>|</tr>','\n',s)
    s=html.unescape(re.sub(r'<[^>]+>','',s))
    return "\n".join(l.strip() for l in s.splitlines() if l.strip())
prods={}
for u,m in d.items():
    mid=re.search(r'products_id=(\d+)',u)
    if not mid or mid.group(1) in prods: continue
    h=open(m["file"],encoding="utf-8").read()
    t=re.search(r"<h2 class='page-title'[^>]*>(.*?)</h2>",h,re.S)
    bc=re.search(r"<div class='breadcrumb'>(.*?)</div>",h,re.S)
    crumbs=[text(x) for x in re.findall(r'<a[^>]*>(.*?)</a>',bc.group(1))][1:] if bc else []
    gal=re.findall(r'<div class="fotorama".*?</div>',h,re.S)
    imgs=re.findall(r'<a href="(https://cdn1\.npcdn\.net/image/[^"?]+)',gal[0]) if gal else []
    pdfs=re.findall(r'<a href="(https://cdn1\.npcdn\.net/userfiles/[^"]+\.pdf)"',h,re.I)
    desc=re.search(r'<div class="showproduct-desc">(.*?)<div class="fb-like"',h,re.S)
    dh=desc.group(1) if desc else ""
    inl=re.findall(r'src="(https://cdn1\.npcdn\.net/userfiles/[^"]+)"',dh)
    price=re.search(r'class="product-price"[^>]*>([^<]+)',h)
    dt=text(dh)
    prods[mid.group(1)]={"id":mid.group(1),"title":text(t.group(1)) if t else m["title"],"category_path":crumbs,
      "price":price.group(1).strip() if price else "","gallery":imgs,"pdfs":pdfs,"desc_images":inl,
      "desc_chars":len(dt),"description":dt,"url":u}
P=list(prods.values())
json.dump(P,open("products.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
with open("products.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.writer(f);w.writerow(["id","title","category","price","gallery_imgs","pdfs","desc_chars","url"])
    for p in P: w.writerow([p["id"],p["title"]," > ".join(p["category_path"]),p["price"],len(p["gallery"]),len(p["pdfs"]),p["desc_chars"],p["url"]])
import collections
print("products",len(P))
print("with price",sum(1 for p in P if p["price"]))
print("with pdf",sum(1 for p in P if p["pdfs"]),"total pdfs",sum(len(p["pdfs"]) for p in P))
print("with gallery",sum(1 for p in P if p["gallery"]))
print("desc>300 chars",sum(1 for p in P if p["desc_chars"]>300),"empty-ish desc",sum(1 for p in P if p["desc_chars"]<50))
c=collections.Counter(" > ".join(p["category_path"][:2]) for p in P)
for k,v in c.most_common(): print(f"{v:4} {k}")
