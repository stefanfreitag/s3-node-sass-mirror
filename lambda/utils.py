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
    """

    :param owner:
    :type owner: string
    :param repository:
    :type repository: string
    :param tag:
    :type tag: string
    :return:
    """
    if not owner:
        raise RuntimeError("Missing owner information.")
    if not repository:
        raise RuntimeError("Missing repository information.")
    if not tag:
        raise RuntimeError("Missing tag information.")
    url = BASE_URL + owner + "/" + repository + "/releases/tags/" + tag
    data = do_request(url)
    return data


def list_releases(owner: str, repository: str) -> dict:
    """
    List the releases existing for a repository hosted in GitHub.
    :param owner: The repository owner, e.g. stefanfreitag
    :type owner: string
    :param repository: The name of the repository.
    :type repository: string
    :return:
    """
    if not owner:
        raise RuntimeError("Missing owner information.")
    if not repository:
        raise RuntimeError("Missing repository information.")
    url = BASE_URL + owner + "/" + repository + "/releases"
    return do_request(url)
