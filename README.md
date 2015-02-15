# cub
command-line github tool
## getting started
cub needs your token.
see [Github help](https://help.github.com/articles/creating-an-access-token-for-command-line-use/)

and you can use

    $ cub issues -u username -t yourtokenishere

if you feel hassle it,
please make '.cub.json' in your repository's top-directory.
like this. (don't forget .gitignore)

    .cub.json
      {
        "user": "github-username",
        "token": "yourtokenishere"
      }

then, you can use

    $ cub issues

## usage
### options

    --user(-u)  : your github's login name
                  This takes priority over your config.

    --token(-t) : your github's token
                  This takes priority over your config.

### issues
list of issues with issue-numbers.

    $ cub issues
