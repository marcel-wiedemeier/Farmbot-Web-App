# A non-resourceful controller for the 'glue' that holds this SPA together.
# Let's try not to overwhelm this control and write as much API as possible.
class DashboardController < ApplicationController
  before_action :authenticate_user!
  def index
  end
end
