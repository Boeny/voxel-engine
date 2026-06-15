install:
	python3 -m venv .venv
	. .venv/bin/activate && pip3 install astroquery

fetch:
	. .venv/bin/activate && python3 -m star_catalog.fetch_stars

bin:
	. .venv/bin/activate && python3 -m star_catalog.make_bin
