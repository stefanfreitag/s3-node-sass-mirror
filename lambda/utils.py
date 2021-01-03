import logging

import requests

BASE_URL = "https://api.github.com/repos/"


def do_request(url: str):
    if not url:
        raise RuntimeError("Missing url information.")
    r = requests.get(url)
    if r.status_code == 200:
        return r.json()
    else:
        logging.error(
            "Received error code " + str(r.status_code) + " when calling Github API."
        )


def get_release_by_tag(owner: str, repository: str, tag: str) -> dict:
    if not owner:
        raise RuntimeError("Missing owner information.")
    if not repository:
        raise RuntimeError("Missing owner information.")
    if not tag:
        raise RuntimeError("Missing tag information.")
    url = BASE_URL + owner + "/" + repository + "/releases/tags/" + tag
    data = do_request(url)
    return data


def list_releases(owner: str, repository: str) -> dict:
    """
    List the released existing for a repository hosted in GitHub.
    :param owner: The repository owner, e.g. stefanfreitag
    :param repository: The name of the repository.
    :return:
    """
    if not owner:
        raise RuntimeError("Missing owner information.")
    if not repository:
        raise RuntimeError("Missing owner information.")
    url = BASE_URL + owner + "/" + repository + "/releases"
    return do_request(url)

