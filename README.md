thumbnaild
==========

the missing thumbnail service for amazone AWS S3.


```
<img src="http://localhost:3000/90x90/my-pics/2010-10/DSC_1.jpg" />
<img src="http://localhost:3000/full/huizhe_pictures/test2.jpg?sign=12b74babb069365781b23bfe61274f91ba210452" />
```

## Features:
* generate thumabnails for images storaged on AWS S3 through HTTP (uses imagemagick)
* caching support on both hard-disk & S3
* multi bucket & account support (checkout /config/buckets/)
* user-defined thumbanil schemas support (checkout /config/schemas/)

## Planing:
* support for other storage system other than S3 (mogilefs, etc)
* more testcases

## License 

(The MIT License)

Copyright (c) 2013 Huizhe XIAO &lt;huizhe.xiao@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.