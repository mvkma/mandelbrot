BUILDDIR = public
INDEX = index.html
SRC = src
ASSETS = assets
SRCS = $(SRC) $(ASSETS)

$(BUILDDIR):
	mkdir -p $@

clean:
	rm -rf $(BUILDDIR)

web: $(SRCS)
	cp $(SRC)/*.js ~/web/assets/js
	cp $(ASSETS)/css/mandelbrot.css ~/web/assets/css/mandelbrot.css
	cp -r $(ASSETS)/glsl ~/web/assets

release: $(BUILDDIR) $(SRCS)
	cp -f $(INDEX) $(BUILDDIR)
	cp -rf  $(SRCS) $(BUILDDIR)

serve:
	python -m http.server --bind 127.0.0.1 -d . 8080
