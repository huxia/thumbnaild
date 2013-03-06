thumbnaild
==========

the missing thumbnail service for amazone AWS S3.


```
<img src="http://localhost:3000/90x90/my-pics/2010-10/DSC_1.jpg" />
<img src="http://localhost:3000/full/my-pics/2010-10/DSC_1.jpg" />
```

Features:
* generate thumabnails for images storaged on AWS S3 through HTTP
* caching support on both hard-disk & S3
* multi bucket & account support (checkout /config/buckets/)
* user-defined thumbanil schemas support (checkout /config/schemas/)

Planing:
* url signing
* support for other storage system other than S3 (mogilefs, etc)