import subprocess
import shutil
import os
import sys

argv = sys.argv

OUTPUT_FILE_PATH_DEFAULT = "./dist/domshot.modern.js"
OUTPUT_FILE_SET = "./dist/index.m.js"
# DOCS_FILE_PATH = "./docs/ui/index.js"


def run():
    ln = len(argv)
    suf = ""
    if ln == 2 and argv[1] == "--opt":
        suf = "-opt"
    command = f"microbundle-start{suf}"

    if os.path.isdir("./dist"):
        shutil.rmtree("./dist")

    subprocess.Popen(["npm", "run", command]).wait()

    os.rename(OUTPUT_FILE_PATH_DEFAULT, OUTPUT_FILE_SET)

    # shutil.copyfile(OUTPUT_FILE_SET, DOCS_FILE_PATH)


if __name__ == "__main__":
    run()
