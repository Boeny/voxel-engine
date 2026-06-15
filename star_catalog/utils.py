import json


def loadJSON(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        return None


def saveJSON(file_path, data):
    with open(file_path, 'w') as file:
        json.dump(data, file, indent=2, ensure_ascii=False)

    print(f'\nWritten to {file_path}')
