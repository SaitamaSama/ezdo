import * as React from 'react';
import { Typography, Paper, IconButton, Tooltip, Button, LinearProgress } from '@material-ui/core';
import "../scss/group.scss";
import AddIcon from '@material-ui/icons/AddTwoTone';
import MoreIcon from '@material-ui/icons/MoreVert';
import { observer } from 'mobx-react';
import { observable, computed } from 'mobx';
import { NewTask } from './new-task';
import { Todo } from '../../../../backend/entities/todo';
import { API_HOST, API_TODOS, API_GROUPS } from '../../util/api-routes';
import { Task } from './task';
import { GroupDeleteConfirm } from './dialogs/group-delete-confirm';
import { WithSnackbarProps, withSnackbar } from 'notistack';
import { GroupMenu } from './group-menu';
import { Skeleton } from '@material-ui/lab';

export interface GroupProps extends WithSnackbarProps {
  title: string;
  id: number;
  refreshGroup: (groupId: number) => any;
  groupUpdate: number;
  refresh: () => any;
  className?: string;
}

export enum TaskSortMode {
  RecentFirst,
  ExpiringFirst
}

@observer
class GroupComponent extends React.Component<GroupProps> {
  @observable private createMode: boolean = false;
  @observable private tasks: Array<Todo> = [];
  @observable private confirmDelete: boolean = false;
  @observable private groupMenuAnchor: HTMLButtonElement|null = null;
  @observable private sortMode: TaskSortMode = TaskSortMode.RecentFirst;
  @observable private loadingTasks: boolean = false;

  private async getTasks(): Promise<void> {
    this.loadingTasks = true;
    const response = await fetch(`${API_HOST}${API_TODOS}/${this.props.id}/all`, {
      headers: {
        Authorization: localStorage.getItem("jwtKey") || ""
      }
    });
    
    const responseJSON = await response.json();
    this.loadingTasks = false;

    if(responseJSON.failed) {
      console.error(responseJSON);
      this.props.enqueueSnackbar(responseJSON.reason, {
        variant: "error"
      });
      return;
    }

    this.tasks = responseJSON;
  }

  public componentDidMount() {
    this.getTasks();
  }

  public componentDidUpdate(prevProps: GroupProps) {
    if(prevProps.groupUpdate !== this.props.groupUpdate) {
      this.getTasks();
    }
  }

  @computed private get noContent(): React.ReactNode {
    if(!this.createMode && !this.loadingTasks && this.tasks.length === 0) {
      return (
        <section className="no-content">
          <div className="illustration" />
          <Typography variant="body1" className="text">
            Looks like there's no tasks in this group yet. Create one by clicking the Add icon above!
          </Typography>
        </section>
      );
    }

    return null;
  }

  private sortTasks(a: Todo, b: Todo): number {
    return (new Date(a.dueDate)).getTime() - (new Date(b.dueDate)).getTime();
  }

  @computed private get tasksRender(): React.ReactNode {
    if(this.tasks.length === 0) return null;

    return (
      <section className="tasks">
        {this.tasks.sort((a, b) => this.sortTasks(a, b)).map(task => (
          <Task {...task} refresh={() => this.getTasks()} refreshGroup={this.props.refreshGroup} key={task.id} />
        ))}
        {/* <section className="task-create-button" onClick={() => this.createMode = true}>
          <AddIcon /> <Typography variant="button">Add task</Typography>
        </section> */}
      </section>
    );
  }

  private async deleteGroup(): Promise<void> {
    this.confirmDelete = false;
    const key = this.props.enqueueSnackbar(`Deleting group '${this.props.title}...'`, {
      variant: "default",
      autoHideDuration: 3000
    });
    const response = await fetch(`${API_HOST}${API_GROUPS}/${this.props.id}`, {
      method: "DELETE",
      headers: {
        Authorization: localStorage.getItem("jwtKey") || ''
      }
    });

    const responseJSON = await response.json();
    this.props.closeSnackbar(key);
    if(responseJSON.failed) {
      console.error(responseJSON);
      this.props.enqueueSnackbar(responseJSON.reason, {
        variant: "error"
      });
      return;
    }

    this.props.enqueueSnackbar("Deleted group successfully.", {
      variant: "info"
    });
    this.props.refresh();
  }

  @computed public get loading(): React.ReactNode {
    if(!this.loadingTasks) return null;

    return (
      <section className="loader-container">
        { this.tasks.length === 0 ? (
          <>
            <Typography variant="h6" color="textSecondary">Loading Tasks...</Typography>
            <Skeleton variant="rect" className="task-loader-skeleton" />
          </>
        ) : (
          <LinearProgress color="primary" className="progress-bar" />
        ) }
      </section>
    )
  }
  
  public render() {
    return (
      <Paper className={`group ${this.props.className}`} elevation={2}>
        {Boolean(this.groupMenuAnchor) && (
          <GroupMenu
            onDelete={() => { this.confirmDelete = true; this.groupMenuAnchor = null; }}
            onClose={() => this.groupMenuAnchor = null}
            open={Boolean(this.groupMenuAnchor)}
            anchorEl={this.groupMenuAnchor} />
        )}
        <GroupDeleteConfirm
          close={() => this.confirmDelete = false}
          onClose={() => this.confirmDelete = false}
          onDelete={() => this.deleteGroup()}
          open={this.confirmDelete} />
        <header className="group-header">
          <Typography variant="h5" className="title">{this.props.title}</Typography>
          <section className="group-action">
            <div className="add-task-button-container">
              <Button variant="text" color="secondary"  onClick={() => this.createMode = true} size="small">
                <AddIcon /> Add Task
              </Button>
            </div>
            <Tooltip title="More Actions">
              <IconButton onClick={(ev) => this.groupMenuAnchor = ev.currentTarget}>
                <MoreIcon />
              </IconButton>
            </Tooltip>
          </section>
        </header>
        {this.createMode && <NewTask groupId={this.props.id} refresh={() => this.getTasks()} cancelCreation={() => this.createMode = false} />}
        {this.loading}
        {this.noContent}
        {this.tasksRender}
      </Paper>
    )
  }
}

export const Group = withSnackbar(GroupComponent);
