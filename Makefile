install:
	python3 -m venv .venv
	. .venv/bin/activate && pip3 install astroquery

fetch:
	. .venv/bin/activate && python3 fetch_stars.py
