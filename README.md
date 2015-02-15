# cub 0.0.1

command-line tool for browsing github.

## features

###### issues
list of issues with issue-numbers.

    $ cub issues

## getting started

after these 3 steps,
yout repository will be like below

    your-repo/
      cub   <-------- cub command
      .cub/ <-------- cub directory
        .cub.json <-- cub's config file
        ...

#### 1 create token

cub needs your token. see [Github help](https://help.github.com/articles/creating-an-access-token-for-command-line-use/)

#### 2 clone

clone cub into your repo's working-directory (and put its link)

    $ cd work/your-repo
    $ git clone https://github.com/craftpaperbag/cub.githttps://github.com/craftpaperbag/cub.git
    $ mv cub .cub
    $ ln -s .cub/cub.js cub

you can use

    $ cub issues -u username -t yourtokenishere

add '.cub/' & 'cub' .gitignore

    $ vim .gitignore
    .cub
    cub

#### 3 config cub

if you feel hassle these options,
please make '.cub.json' in your '.cub/' directory.
like this. ( .gitignore)

    $ vim .cub/.cub.json
      {
        "user": "github-username",
        "token": "yourtokenishere"
      }

then, you can use

    $ cub issues

## options

    --user(-u)  : your github's login name
                  This takes priority over your config.

    --token(-t) : your github's token
                  This takes priority over your config.

