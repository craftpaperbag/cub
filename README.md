# cub 0.0.3

Command-line tool for browsing github.

## Features

#### Issues

    $ cub issues        # List of issues with issue-numbers
    $ cub issue 123     # show an issue
    $ cub open          # Open new issue

## Getting started

After these 3 steps,
your repository will be as follows.

    your-repo/
      ...
      cub   <-------- cub command
      .cub/ <-------- cub directory
        .cub.json <-- cub's config file

#### 1. Create token

Cub needs your token. see [Github help](https://help.github.com/articles/creating-an-access-token-for-command-line-use/).

#### 2. Clone

Clone cub into your repo's working-directory. (and put its link)

    $ cd work/your-repo
    $ git clone https://github.com/craftpaperbag/cub.git
    $ mv cub .cub
    $ ln -s .cub/cub.js cub

Now, you can use

    $ cub issues -u username -t yourtokenishere

Add '.cub/' & 'cub' into .gitignore

    $ vim .gitignore
    .cub
    cub

#### 3. Config cub

If you feel hassled these options,
Please make '.cub.json' in your '.cub/' directory.
As follows

    $ vim .cub/.cub.json
      {
        "user": "github-username",
        "token": "yourtokenishere"
      }

then, you can use

    $ cub

## Options

    --user(-u)  : your github's login name
                  This takes priority over your config.

    --token(-t) : your github's token
                  This takes priority over your config.

